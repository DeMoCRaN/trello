const { Pool } = require('pg');
const logger = require('../logger');

// =============================================
// БЕЗОПАСНЫЕ УТИЛИТЫ
// =============================================

async function safeQuery(client, query, params = []) {
    try {
        // Валидация параметров
        params.forEach((param, index) => {
            if (param === null || param === undefined) return;
            
            if (typeof param === 'string') {
                if (/[;'"\\]|(--)|(\/\*)/.test(param)) {
                    const errorMsg = `Обнаружена потенциальная SQL-инъекция в параметре ${index}: ${param.substring(0, 50)}...`;
                    logger.warn(errorMsg);
                    throw new Error('Обнаружены недопустимые символы во входных данных');
                }
            }
        });

        const result = await client.query(query, params);
        logger.debug(`Выполнен SQL-запрос: ${query.substring(0, 100)}...`, {
            params: params.map(p => typeof p === 'string' ? p.substring(0, 20) : p)
        });
        return result;
    } catch (error) {
        logger.error('Ошибка выполнения SQL-запроса', {
            query: query.substring(0, 200),
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

function validateId(id, name = 'ID') {
    try {
        if (id === undefined || id === null) {
            throw new Error(`${name} не указан`);
        }
        
        const numId = Number(id);
        if (!Number.isInteger(numId)) {
            throw new Error(`${name} должен быть целым числом`);
        }
        
        if (numId <= 0) {
            throw new Error(`${name} должен быть положительным числом`);
        }
        
        return numId;
    } catch (error) {
        logger.warn(`Ошибка валидации ID: ${id}`, { 
            error: error.message,
            name
        });
        throw error;
    }
}

function validateText(text, fieldName, maxLength = 255) {
    try {
        if (text === undefined || text === null) {
            throw new Error(`Поле ${fieldName} обязательно для заполнения`);
        }
        
        if (typeof text !== 'string') {
            throw new Error(`Поле ${fieldName} должно быть строкой`);
        }
        
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            throw new Error(`Поле ${fieldName} не может быть пустым`);
        }
        
        if (trimmed.length > maxLength) {
            throw new Error(`Поле ${fieldName} превышает максимальную длину ${maxLength} символов`);
        }
        
        return trimmed;
    } catch (error) {
        logger.warn(`Ошибка валидации текстового поля: ${fieldName}`, { 
            value: text,
            error: error.message 
        });
        throw error;
    }
}

// =============================================
// ОСНОВНЫЕ ФУНКЦИИ
// =============================================

async function getAssignments(pool, creator_id, includeArchived = false) {
    const client = await pool.connect();
    try {
        const validatedCreatorId = validateId(creator_id, 'ID создателя');
        logger.info(`Получение заданий для пользователя ID: ${validatedCreatorId}`);

        // Получаем все задания пользователя
        const assignmentsResult = await safeQuery(
            client,
            'SELECT * FROM assignments WHERE creator_id = $1 ORDER BY created_at DESC',
            [validatedCreatorId]
        );
        
        const assignments = assignmentsResult.rows;
        logger.debug(`Найдено заданий: ${assignments.length}`);

        // Для каждого задания получаем задачи
        for (const assignment of assignments) {
            try {
                // Базовый запрос для активных задач
                let tasksQuery = `
                    SELECT 
                        t.id, t.title, t.description, t.deadline, t.seen_at, 
                        t.in_progress_since, t.work_duration, t.created_at, 
                        t.updated_at, t.status_id, t.priority_id,
                        t.creator_id, t.assignee_id, t.progress_percentage,
                        ts.name AS status, 
                        tp.name AS priority,
                        u1.email AS creator_name, 
                        u2.email AS assignee_name,
                        NULL AS deleted_at,
                        FALSE AS is_archived
                    FROM tasks t
                    LEFT JOIN task_statuses ts ON t.status_id = ts.id
                    LEFT JOIN task_priorities tp ON t.priority_id = tp.id
                    LEFT JOIN users u1 ON t.creator_id = u1.id
                    LEFT JOIN users u2 ON t.assignee_id = u2.id
                    WHERE t.assignment_id = $1 AND t.creator_id = $2
                `;

                // Добавляем архивные задачи, если нужно
                if (includeArchived) {
                    tasksQuery += `
                        UNION ALL
                        SELECT 
                            at.id, at.title, at.description, at.deadline, at.seen_at, 
                            at.in_progress_since, at.work_duration, at.created_at, 
                            at.updated_at, at.status_id, at.priority_id,
                            at.creator_id, at.assignee_id, at.progress_percentage,
                            ts.name AS status, 
                            tp.name AS priority,
                            u1.email AS creator_name, 
                            u2.email AS assignee_name,
                            at.deleted_at,
                            TRUE AS is_archived
                        FROM archived_tasks at
                        LEFT JOIN task_statuses ts ON at.status_id = ts.id
                        LEFT JOIN task_priorities tp ON at.priority_id = tp.id
                        LEFT JOIN users u1 ON at.creator_id = u1.id
                        LEFT JOIN users u2 ON at.assignee_id = u2.id
                        WHERE at.assignment_id = $1 AND at.creator_id = $2
                    `;
                }

                tasksQuery += ' ORDER BY created_at DESC';

                const tasksResult = await safeQuery(
                    client,
                    tasksQuery,
                    [assignment.id, validatedCreatorId]
                );
                
                // Преобразуем данные для фронтенда
                assignment.tasks = tasksResult.rows.map(task => ({
                    ...task,
                    deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
                    created_at: new Date(task.created_at).toISOString(),
                    updated_at: new Date(task.updated_at).toISOString(),
                    seen_at: task.seen_at ? new Date(task.seen_at).toISOString() : null,
                    in_progress_since: task.in_progress_since ? new Date(task.in_progress_since).toISOString() : null,
                    deleted_at: task.deleted_at ? new Date(task.deleted_at).toISOString() : null
                }));

                logger.debug(`Для задания ID ${assignment.id} найдено задач: ${tasksResult.rows.length}`);
            } catch (error) {
                logger.error(`Ошибка при получении задач для задания ID ${assignment.id}`, {
                    error: error.message,
                    assignmentId: assignment.id
                });
                assignment.tasks = [];
            }
        }

        return assignments;
    } catch (error) {
        logger.error('Ошибка при получении заданий', {
            error: error.message,
            creator_id,
            stack: error.stack
        });
        throw error;
    } finally {
        client.release();
    }
}

async function createAssignment(pool, { title, description, creator_id }) {
    const client = await pool.connect();
    try {
        logger.info('Создание нового задания', { 
            title: title.substring(0, 50),
            creator_id 
        });

        // Валидация входных данных (описание теперь необязательно)
        const validatedData = {
            title: validateText(title, 'Название задания'),
            description: description ? validateText(description, 'Описание', 2000) : null,
            creator_id: validateId(creator_id, 'ID создателя')
        };

        const query = `
            INSERT INTO assignments 
                (title, description, creator_id, created_at, updated_at) 
            VALUES ($1, $2, $3, now(), now()) 
            RETURNING *
        `;

        logger.debug('Выполнение запроса на создание задания', {
            query: query.substring(0, 100) + '...',
            params: [
                validatedData.title.substring(0, 20) + '...',
                validatedData.description?.substring(0, 20) + '...' || 'NULL',
                validatedData.creator_id
            ]
        });

        const result = await safeQuery(client, query, [
            validatedData.title,
            validatedData.description,
            validatedData.creator_id
        ]);

        if (!result.rows[0]) {
            const errorMsg = 'Не удалось создать задание - сервер не вернул данные';
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        const createdAssignment = result.rows[0];
        logger.info('Задание успешно создано', { 
            assignmentId: createdAssignment.id,
            title: createdAssignment.title.substring(0, 50) + '...'
        });

        return createdAssignment;
    } catch (error) {
        logger.error('Ошибка при создании задания', {
            error: error.message,
            stack: error.stack,
            inputData: { 
                title: title?.substring(0, 50),
                creator_id 
            }
        });
        throw error;
    } finally {
        client.release();
    }
}

async function createTaskInAssignment(pool, assignmentId, taskData) {
    const client = await pool.connect();
    try {
        logger.info('Создание задачи в задании', { 
            assignmentId,
            taskTitle: taskData.title?.substring(0, 50) 
        });

        // Валидация данных
        const validatedData = {
            assignmentId: validateId(assignmentId, 'ID задания'),
            title: validateText(taskData.title, 'Название задачи'),
            description: validateText(taskData.description || '', 'Описание задачи', 2000),
            deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
            creator_id: validateId(taskData.creator_id, 'ID создателя задачи'),
            assignee_id: validateId(taskData.assignee_id, 'ID исполнителя'),
            status_id: validateId(taskData.status_id, 'ID статуса'),
            priority_id: validateId(taskData.priority_id, 'ID приоритета')
        };

        const query = `
            INSERT INTO tasks 
                (title, description, deadline, creator_id, assignee_id, 
                status_id, priority_id, assignment_id, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
            RETURNING *
        `;

        const result = await safeQuery(client, query, [
            validatedData.title,
            validatedData.description,
            validatedData.deadline,
            validatedData.creator_id,
            validatedData.assignee_id,
            validatedData.status_id,
            validatedData.priority_id,
            validatedData.assignmentId
        ]);

        if (!result.rows[0]) {
            const errorMsg = 'Не удалось создать задачу - сервер не вернул данные';
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        const createdTask = result.rows[0];
        logger.info('Задача успешно создана', { 
            taskId: createdTask.id,
            assignmentId: createdTask.assignment_id
        });

        return createdTask;
    } catch (error) {
        logger.error('Ошибка при создании задачи в задании', {
            error: error.message,
            stack: error.stack,
            assignmentId,
            taskData: {
                title: taskData.title?.substring(0, 50),
                creator_id: taskData.creator_id
            }
        });
        throw error;
    } finally {
        client.release();
    }
}

async function deleteAssignment(pool, assignmentId) {
    const client = await pool.connect();
    try {
        logger.info('Удаление задания', { assignmentId });

        await client.query('BEGIN');

        const validatedId = validateId(assignmentId, 'ID задания');

        // 1. Удаляем все задачи задания
        const deleteTasksResult = await safeQuery(
            client,
            'DELETE FROM tasks WHERE assignment_id = $1 RETURNING id',
            [validatedId]
        );
        logger.debug(`Удалено задач: ${deleteTasksResult.rowCount}`);

        // 2. Удаляем само задание
        const deleteAssignmentResult = await safeQuery(
            client,
            'DELETE FROM assignments WHERE id = $1 RETURNING id',
            [validatedId]
        );

        if (deleteAssignmentResult.rowCount === 0) {
            const errorMsg = `Задание с ID ${validatedId} не найдено`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        await client.query('COMMIT');
        logger.info('Задание успешно удалено', { assignmentId: validatedId });

        return { success: true, deletedTasks: deleteTasksResult.rowCount };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Ошибка при удалении задания', {
            error: error.message,
            stack: error.stack,
            assignmentId
        });
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    getAssignments,
    createAssignment,
    createTaskInAssignment,
    deleteAssignment,
    // Экспортируем утилиты для тестирования
    _test: {
        safeQuery,
        validateId,
        validateText
    }
};
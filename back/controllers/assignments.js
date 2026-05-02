const { Pool } = require('pg');
const logger = require('../logger');
const auditController = require('./audit-backend');

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
    // Используем функцию с аудитом
    return await auditController.createAssignmentWithAudit(pool, { title, description }, creator_id);
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

async function inviteUserToAssignment(pool, assignmentId, userId, invitedBy) {
    const client = await pool.connect();
    try {
        logger.info('Приглашение пользователя в команду проекта', { 
            assignmentId, 
            userId, 
            invitedBy 
        });

        // Валидация данных
        const validatedAssignmentId = validateId(assignmentId, 'ID проекта');
        const validatedUserId = validateId(userId, 'ID пользователя');
        const validatedInvitedBy = validateId(invitedBy, 'ID приглашающего');

        // Проверяем, что приглашающий имеет права (создатель проекта или admin)
        const permissionCheck = await safeQuery(
            client,
            `SELECT a.creator_id, u.role_id, r.name as role_name 
             FROM assignments a 
             JOIN users u ON u.id = $1 
             JOIN roles r ON r.id = u.role_id 
             WHERE a.id = $2`,
            [validatedInvitedBy, validatedAssignmentId]
        );

        if (permissionCheck.rows.length === 0) {
            throw new Error('Проект не найден');
        }

        const { creator_id, role_name } = permissionCheck.rows[0];
        if (creator_id !== validatedInvitedBy && role_name !== 'admin') {
            throw new Error('Недостаточно прав для приглашения пользователей');
        }

        // Проверяем, что пользователь не является создателем проекта
        if (creator_id === validatedUserId) {
            throw new Error('Создатель проекта уже является членом команды');
        }

        // Проверяем, что пользователь не уже приглашен
        const existingInvitation = await safeQuery(
            client,
            'SELECT id FROM assignment_members WHERE assignment_id = $1 AND user_id = $2',
            [validatedAssignmentId, validatedUserId]
        );

        if (existingInvitation.rows.length > 0) {
            throw new Error('Пользователь уже приглашен в этот проект');
        }

        // Создаем приглашение
        const result = await safeQuery(
            client,
            `INSERT INTO assignment_members 
                (assignment_id, user_id, invited_by, status, invited_at) 
             VALUES ($1, $2, $3, 'pending', now()) 
             RETURNING *`,
            [validatedAssignmentId, validatedUserId, validatedInvitedBy]
        );

        logger.info('Пользователь успешно приглашен в проект', { 
            invitationId: result.rows[0].id,
            assignmentId: validatedAssignmentId,
            userId: validatedUserId
        });

        return result.rows[0];
    } catch (error) {
        logger.error('Ошибка при приглашении пользователя в проект', {
            error: error.message,
            stack: error.stack,
            assignmentId,
            userId,
            invitedBy
        });
        throw error;
    } finally {
        client.release();
    }
}

async function getTeamMembers(pool, assignmentId) {
    const client = await pool.connect();
    try {
        const validatedAssignmentId = validateId(assignmentId, 'ID проекта');
        logger.info('Получение состава команды проекта', { assignmentId: validatedAssignmentId });

        const result = await safeQuery(
            client,
            `SELECT 
                am.id,
                am.assignment_id,
                am.user_id,
                am.invited_by,
                am.status,
                am.invited_at,
                am.responded_at,
                u.email as user_email,
                u.username as user_name,
                inviter.email as invited_by_email,
                inviter.username as invited_by_name
             FROM assignment_members am
             JOIN users u ON am.user_id = u.id
             JOIN users inviter ON am.invited_by = inviter.id
             WHERE am.assignment_id = $1
             ORDER BY am.invited_at DESC`,
            [validatedAssignmentId]
        );

        logger.debug(`Найдено членов команды: ${result.rows.length}`);
        return result.rows;
    } catch (error) {
        logger.error('Ошибка при получении состава команды', {
            error: error.message,
            stack: error.stack,
            assignmentId
        });
        throw error;
    } finally {
        client.release();
    }
}

async function removeTeamMember(pool, assignmentId, memberUserId, actorUserId) {
    const client = await pool.connect();
    try {
        const validatedAssignmentId = validateId(assignmentId, 'ID проекта');
        const validatedMemberUserId = validateId(memberUserId, 'ID участника');
        const validatedActorUserId = validateId(actorUserId, 'ID пользователя');

        const permissionResult = await safeQuery(
            client,
            `SELECT a.creator_id, r.name AS role_name
             FROM assignments a
             JOIN users u ON u.id = $1
             JOIN roles r ON r.id = u.role_id
             WHERE a.id = $2`,
            [validatedActorUserId, validatedAssignmentId]
        );

        if (permissionResult.rows.length === 0) {
            throw new Error('Проект не найден');
        }

        const { creator_id, role_name } = permissionResult.rows[0];
        if (Number(creator_id) !== validatedActorUserId && role_name !== 'admin') {
            throw new Error('Недостаточно прав для управления составом команды');
        }

        if (Number(creator_id) === validatedMemberUserId) {
            throw new Error('Нельзя удалить создателя проекта из команды');
        }

        const deleteResult = await safeQuery(
            client,
            `DELETE FROM assignment_members
             WHERE assignment_id = $1
               AND user_id = $2
             RETURNING id, assignment_id, user_id, status`,
            [validatedAssignmentId, validatedMemberUserId]
        );

        if (deleteResult.rows.length === 0) {
            throw new Error('Участник не найден в составе команды');
        }

        return deleteResult.rows[0];
    } finally {
        client.release();
    }
}

async function respondToInvitation(pool, invitationId, userId, status, assignmentId = null) {
    const client = await pool.connect();
    try {
        logger.info('Ответ на приглашение в проект', {
            invitationId,
            userId,
            status,
            assignmentId
        });

        const validatedInvitationId = validateId(invitationId, 'ID приглашения');
        const validatedUserId = validateId(userId, 'ID пользователя');

        if (!['accepted', 'rejected'].includes(status)) {
            throw new Error('Неверный статус ответа. Допустимые значения: "accepted" или "rejected"');
        }

        // Улучшенная проверка: убеждаемся, что приглашение принадлежит пользователю и проекту
        let query = `
            SELECT am.id, am.assignment_id, am.user_id, am.invited_by, am.status, a.title as assignment_title, u.username as invitee_name
            FROM assignment_members am
            JOIN assignments a ON am.assignment_id = a.id
            JOIN users u ON am.user_id = u.id
            WHERE am.id = $1 AND am.user_id = $2 AND am.status = 'pending'
        `;
        let params = [validatedInvitationId, validatedUserId];

        // Если передан assignmentId, добавляем дополнительную проверку
        if (assignmentId !== null) {
            const validatedAssignmentId = validateId(assignmentId, 'ID проекта');
            query += ' AND am.assignment_id = $3';
            params.push(validatedAssignmentId);
        }

        const invitationCheck = await safeQuery(client, query, params);

        if (invitationCheck.rows.length === 0) {
            throw new Error('Приглашение не найдено, уже обработано или не принадлежит вам');
        }

        const invitation = invitationCheck.rows[0];

        // Обновляем статус приглашения
        const result = await safeQuery(
            client,
            `UPDATE assignment_members
             SET status = $1, responded_at = now()
             WHERE id = $2
             RETURNING *`,
            [status, validatedInvitationId]
        );

        // If invitation is accepted, notify inviter
        if (status === 'accepted') {
            logger.info('Invitation accepted by user', {
                userId: validatedUserId,
                assignmentId: invitation.assignment_id,
                assignmentTitle: invitation.assignment_title
            });
        } else {
            logger.info('Invitation rejected by user', {
                userId: validatedUserId,
                assignmentId: invitation.assignment_id,
                assignmentTitle: invitation.assignment_title
            });
        }

        logger.info('Ответ на приглашение обработан', {
            invitationId: validatedInvitationId,
            status,
            assignmentTitle: invitation.assignment_title
        });

        return result.rows[0];
    } catch (error) {
        logger.error('Ошибка при ответе на приглашение', {
            error: error.message,
            stack: error.stack,
            invitationId,
            userId,
            status,
            assignmentId
        });
        throw error;
    } finally {
        client.release();
    }
}

async function getPendingInvitations(pool, userId) {
    const client = await pool.connect();
    try {
        const validatedUserId = validateId(userId, 'ID пользователя');
        logger.info('Получение ожидающих приглашений пользователя', { userId: validatedUserId });

        const result = await safeQuery(
            client,
            `SELECT
                am.id,
                am.assignment_id,
                am.invited_by,
                am.invited_at,
                am.status,
                a.title as assignment_title,
                a.description as assignment_description,
                inviter.email as invited_by_email,
                inviter.username as invited_by_name
             FROM assignment_members am
             JOIN assignments a ON am.assignment_id = a.id
             JOIN users inviter ON am.invited_by = inviter.id
             WHERE am.user_id = $1 AND am.status = 'pending'
             ORDER BY am.invited_at DESC`,
            [validatedUserId]
        );

        logger.debug(`Найдено ожидающих приглашений: ${result.rows.length}`);
        return result.rows;
    } catch (error) {
        logger.error('Ошибка при получении приглашений', {
            error: error.message,
            stack: error.stack,
            userId
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
    inviteUserToAssignment,
    getTeamMembers,
    removeTeamMember,
    respondToInvitation,
    getPendingInvitations,
    _test: {
        safeQuery,
        validateId,
        validateText
    }
};


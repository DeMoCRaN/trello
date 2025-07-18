import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  Card, CardContent, Grid, Typography, CircularProgress, Box, 
  MenuItem, Select, FormControl, InputLabel, Divider, Chip, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from '../components/Header';
import TaskNotification from '../components/TaskNotification';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';

// Styled components
const PageContainer = styled('div')({
  backgroundColor: '#f5f7fa',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});

const ContentContainer = styled('div')({
  padding: '24px',
  maxWidth: '1400px',
  margin: '0 auto',
  paddingTop: '80px'
});

const DashboardTitle = styled(Typography)({
  marginBottom: '24px',
  color: '#1976d2',
  fontWeight: 600,
});

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[4],
  },
}));

const ChartCard = styled(Card)({
  height: '100%',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
});

const StyledSelect = styled(Select)({
  backgroundColor: '#fff',
  borderRadius: '8px',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e0e0e0',
  },
});

const MetricItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px'
});

// Helper functions
const getStatusById = (id) => {
  switch(id) {
    case 1: return 'new';
    case 2: return 'in_progress';
    case 3: return 'done';
    default: return 'unknown';
  }
};

const getPriorityById = (id) => {
  switch(id) {
    case 1: return 'low';
    case 2: return 'medium';
    case 3: return 'high';
    default: return 'unknown';
  }
};

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0m 0s';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
};

const Dashboard = ({ userEmail: propUserEmail }) => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(propUserEmail || '');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [taskFilter, setTaskFilter] = useState('active'); // 'active', 'archived', 'all'

  const onNavigate = useCallback((page) => {
    navigate(`/${page}`);
  }, [navigate]);

  useEffect(() => {
    if (!propUserEmail) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);
          if (decoded?.email) {
            setUserEmail(decoded.email);
          }
        } catch (e) {
          console.error('Failed to decode token:', e);
        }
      }
    }
  }, [propUserEmail]);

  const fetchAssignments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Пользователь не авторизован');

      const response = await fetch('http://localhost:3000/api/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Не удалось загрузить задания');
      const data = await response.json();
      setAssignments(data);
      if (data.length > 0) setSelectedAssignment(data[0].id);
    } catch (err) {
      console.error('Ошибка при загрузке заданий:', err);
      setError(err.message);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!selectedAssignment) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Пользователь не авторизован');

      const response = await fetch(
        `http://localhost:3000/api/assignments/${selectedAssignment}/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
        
      );
      
      
      if (!response.ok) throw new Error(`Не удалось загрузить задачи: ${response.status}`);
      const data = await response.json();
      
      // Преобразуем данные задач
      const processedTasks = data.map(task => ({
        ...task,
        status: getStatusById(task.status_id),
        priority: getPriorityById(task.priority_id),
        work_duration: Number(task.work_duration) || 0,
        due_date: task.deadline || new Date().toISOString(),
        isArchived: !!task.deleted_at // Помечаем архивированные задачи
      }));
      
      setTasks(processedTasks);
    } catch (err) {
      console.error('Ошибка при загрузке задач:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAssignment]);

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3000/api/comments/unread', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) return;
      const data = await response.json();
      const filteredComments = data.filter(comment => 
        comment.author_email !== userEmail
      );
      setUnreadCommentsCount(filteredComments.length);
      setComments(filteredComments);
    } catch (error) {
      console.error('Ошибка при загрузке комментариев:', error);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchAssignments();
    fetchComments();
  }, [fetchAssignments, fetchComments]);

  useEffect(() => {
    if (selectedAssignment) fetchTasks();
  }, [selectedAssignment, fetchTasks]);

  const handleAssignmentChange = (event) => {
    setSelectedAssignment(event.target.value);
  };

  const handleTaskFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setTaskFilter(newFilter);
    }
  };

  // Filter tasks based on selection
  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'active') return !task.isArchived;
    if (taskFilter === 'archived') return task.isArchived;
    return true; // 'all'
  });

  // Calculate statistics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress').length;
  const notStartedTasks = filteredTasks.filter(task => task.status === 'new').length;
  const overdueTasks = filteredTasks.filter(task => 
    new Date(task.due_date) < new Date() && task.status !== 'done'
  ).length;

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalTime = filteredTasks.reduce((sum, task) => {
    const duration = Number(task.work_duration) || 0;
    return sum + (isNaN(duration) ? 0 : duration);
  }, 0);
  
  const avgTimePerTask = totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0;

  // Data for charts
  const statusData = [
    { name: 'Завершено', value: completedTasks },
    { name: 'В работе', value: inProgressTasks },
    { name: 'Новые', value: notStartedTasks }
  ];

  const priorityData = [
    { name: 'Высокий', value: filteredTasks.filter(task => task.priority === 'high').length, color: '#ff6b6b' },
    { name: 'Средний', value: filteredTasks.filter(task => task.priority === 'medium').length, color: '#ffd166' },
    { name: 'Низкий', value: filteredTasks.filter(task => task.priority === 'low').length, color: '#06d6a0' }
  ];

  const timePerTaskData = filteredTasks.map(task => ({
    name: task.title?.substring(0, 15) || 'Задача',
    time: Number(task.work_duration) || 0
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  if (loading) {
    return (
      <PageContainer>
        <Header 
          userEmail={userEmail} 
          onNavigate={onNavigate} 
          unreadCommentsCount={unreadCommentsCount}
          onCommentsClick={() => setShowNotification(true)}
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Header 
          userEmail={userEmail} 
          onNavigate={onNavigate} 
          unreadCommentsCount={unreadCommentsCount}
          onCommentsClick={() => setShowNotification(true)}
        />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header 
        userEmail={userEmail} 
        onNavigate={onNavigate} 
        unreadCommentsCount={unreadCommentsCount}
        onCommentsClick={() => setShowNotification(true)}
      />

      {showNotification && (
        <TaskNotification 
          tasks={tasks} 
          comments={comments}
          onClose={() => setShowNotification(false)}
        />
      )}

      <ContentContainer>
        <DashboardTitle variant="h4">Панель управления заданиями</DashboardTitle>
        
        <FormControl fullWidth margin="normal">
          <InputLabel>Выберите задание</InputLabel>
          <StyledSelect
            value={selectedAssignment}
            onChange={handleAssignmentChange}
            label="Выберите задание"
          >
            {assignments.map(assignment => (
              <MenuItem key={assignment.id} value={assignment.id}>
                {assignment.title}
              </MenuItem>
            ))}
          </StyledSelect>
        </FormControl>

        {selectedAssignment && tasks.length > 0 && (
          <Box mt={2} mb={3}>
            <ToggleButtonGroup
              value={taskFilter}
              onChange={handleTaskFilterChange}
              exclusive
              aria-label="Фильтр задач"
            >
              <ToggleButton value="active" aria-label="Активные">
                Активные
              </ToggleButton>
              <ToggleButton value="archived" aria-label="Архив">
                Архив
              </ToggleButton>
              <ToggleButton value="all" aria-label="Все">
                Все
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {!selectedAssignment && assignments.length === 0 && !loading && (
          <Typography variant="body1" style={{ marginTop: 20 }}>
            Нет доступных заданий
          </Typography>
        )}

        {selectedAssignment && tasks.length === 0 && !loading && (
          <Typography variant="body1" style={{ marginTop: 20 }}>
            Не найдено задач для выбранного задания
          </Typography>
        )}

        {selectedAssignment && tasks.length > 0 && (
          <>
            <Grid container spacing={3} style={{ marginBottom: '20px' }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Всего задач</Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {totalTasks}
                    </Typography>
                    <Divider style={{ margin: '12px 0' }} />
                    <MetricItem>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">Завершено: {completedTasks}</Typography>
                    </MetricItem>
                    <MetricItem>
                      <HourglassEmptyIcon color="warning" fontSize="small" />
                      <Typography variant="body2">В работе: {inProgressTasks}</Typography>
                    </MetricItem>
                    <MetricItem>
                      <ErrorIcon color="error" fontSize="small" />
                      <Typography variant="body2">Просрочено: {overdueTasks}</Typography>
                    </MetricItem>
                  </CardContent>
                </StatsCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Процент выполнения</Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {completionPercentage}%
                    </Typography>
                    <Box mt={2}>
                      <CircularProgress 
                        variant="determinate" 
                        value={completionPercentage} 
                        size={60}
                        thickness={5}
                        color={completionPercentage > 75 ? 'success' : completionPercentage > 50 ? 'warning' : 'error'}
                      />
                    </Box>
                  </CardContent>
                </StatsCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Среднее время на задачу</Typography>
                    <Typography variant="h4" component="div" color="primary">
                      {formatTime(avgTimePerTask)}
                    </Typography>
                    <Divider style={{ margin: '12px 0' }} />
                    <MetricItem>
                      <AccessTimeIcon color="info" fontSize="small" />
                      <Typography variant="body2">Общее время: {formatTime(totalTime)}</Typography>
                    </MetricItem>
                    {filteredTasks.length > 0 && (
                      <Box mt={1}>
                        <Chip 
                          label={`Быстрее всего: ${formatTime(Math.min(...filteredTasks.map(t => Number(t.work_duration) || 0)))}`} 
                            size="small" 
                            color="success"
                          />
                        <Chip 
                           label={`Дольше всего: ${formatTime(Math.max(...filteredTasks.map(t => Number(t.work_duration) || 0)))}`} 
                             size="small" 
                             color="error"
                            style={{ marginLeft: '8px' }}
                          />
                      </Box>
                    )}
                  </CardContent>
                </StatsCard>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <StatsCard>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Задачи по приоритету</Typography>
                    <Box height={120}>
                      {priorityData.some(item => item.value > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={priorityData.filter(item => item.value > 0)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={60}
                              paddingAngle={2}
                            >
                              {priorityData.filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                          <Typography color="textSecondary">Нет данных</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Chip 
                        label={`Высокий: ${filteredTasks.filter(task => task.priority === 'high').length}`} 
                        size="small" 
                        style={{ backgroundColor: '#ff6b6b', color: 'white' }} 
                      />
                      <Chip 
                        label={`Средний: ${filteredTasks.filter(task => task.priority === 'medium').length}`} 
                        size="small" 
                        style={{ backgroundColor: '#ffd166', color: 'black' }} 
                      />
                      <Chip 
                        label={`Низкий: ${filteredTasks.filter(task => task.priority === 'low').length}`} 
                        size="small" 
                        style={{ backgroundColor: '#06d6a0', color: 'white' }} 
                      />
                    </Box>
                  </CardContent>
                </StatsCard>
              </Grid>
            </Grid>

            {/* Основные диаграммы */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <ChartCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Распределение задач по статусу</Typography>
                    {statusData.some(item => item.value > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusData.filter(item => item.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} задач`, 'Количество']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                        <Typography color="textSecondary">Нет данных для отображения</Typography>
                      </Box>
                    )}
                  </CardContent>
                </ChartCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <ChartCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Время, затраченное на задачу</Typography>
                    {timePerTaskData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={timePerTaskData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => formatTime(value).split(' ')[0]} />
                          <Tooltip 
                            formatter={(value) => [formatTime(value), 'Затраченное время']}
                            labelFormatter={(value) => `Задача: ${value}`}
                          />
                          <Legend />
                          <Bar 
                            dataKey="time" 
                            name="Затраченное время" 
                            fill="#8884d8" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                        <Typography color="textSecondary">Нет данных для отображения</Typography>
                      </Box>
                    )}
                  </CardContent>
                </ChartCard>
              </Grid>
            </Grid>

            {/* Дополнительные диаграммы */}
            {filteredTasks.length > 0 && (
              <>
                <Grid container spacing={3} style={{ marginTop: '16px' }}>
                  <Grid item xs={12} md={6}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Динамика выполнения</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={[
                            { name: 'Неделя 1', completed: Math.round(completedTasks * 0.2), total: Math.round(totalTasks * 0.2) },
                            { name: 'Неделя 2', completed: Math.round(completedTasks * 0.5), total: Math.round(totalTasks * 0.5) },
                            { name: 'Неделя 3', completed: Math.round(completedTasks * 0.8), total: Math.round(totalTasks * 0.8) },
                            { name: 'Неделя 4', completed: completedTasks, total: totalTasks },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="completed" stackId="1" stroke="#8884d8" fill="#8884d8" name="Завершено" />
                            <Area type="monotone" dataKey="total" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Всего задач" />
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </ChartCard>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Показатели производительности</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart outerRadius={90} data={[
                            { subject: 'Эффективность', A: completionPercentage, fullMark: 100 },
                            { subject: 'Продуктивность', A: Math.round((completedTasks / totalTasks) * 85), fullMark: 100 },
                            { subject: 'Качество', A: Math.min(95, completionPercentage + 15), fullMark: 100 },
                            { subject: 'Сроки', A: Math.max(80, 100 - (overdueTasks / totalTasks * 100)), fullMark: 100 },
                            { subject: 'Сотрудничество', A: 88, fullMark: 100 },
                          ]}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Производительность" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Legend />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </ChartCard>
                  </Grid>
                </Grid>

                {/* Распределение времени */}
                <Grid container spacing={3} style={{ marginTop: '16px' }}>
                  <Grid item xs={12}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Распределение времени по активности</Typography>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={[
                            { name: 'Планирование', value: 15 },
                            { name: 'Разработка', value: 40 },
                            { name: 'Тестирование', value: 25 },
                            { name: 'Ревью', value: 20 }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis label={{ value: 'Время (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value) => [`${value}%`, 'Процент']} />
                            <Legend />
                            <Bar dataKey="value" fill="#82ca9d" name="Затраченное время" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </ChartCard>
                  </Grid>
                </Grid>
              </>
            )}
          </>
        )}
      </ContentContainer>
    </PageContainer>
  );
};

export default Dashboard;
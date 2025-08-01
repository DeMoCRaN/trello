import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from 'recharts';
import { Card, CardContent, Grid, Typography, CircularProgress, Box, MenuItem, Select, FormControl, InputLabel, Divider, Chip, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from '../components/Header';
import TaskNotification from '../components/TaskNotification';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import './Dashboard.css'

// Стили
const PageContainer = styled('div')({
  backgroundColor: '#f5f7fa',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100%',
  overflow: 'hidden',
});

const ScrollableContainer = styled('div')({
  width: '100%',
  overflowY: 'auto',
  flex: 1,
  paddingTop: '80px', // Учет высоты header
});

const ContentContainer = styled('div')({
  padding: '24px',
  width: '100%',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
});

const DashboardTitle = styled(Typography)({
  marginBottom: '24px',
  color: '#1976d2',
  fontWeight: 600,
});

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  width: '100%',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[4],
  },
}));

const ChartCard = styled(Card)({
  width: '100%',
  height: '100%',
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
});

const StyledSelect = styled(Select)({
  backgroundColor: '#fff',
  borderRadius: '8px',
  width: '100%',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e0e0e0',
  },
});

const MetricItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  width: '100%'
});

// Вспомогательные функции
const getStatusById = (id) => {
  switch (id) {
    case 1: return 'new';
    case 2: return 'in_progress';
    case 3: return 'done';
    default: return 'unknown';
  }
};

const getPriorityById = (id) => {
  switch (id) {
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
  const [taskFilter, setTaskFilter] = useState('active');

  // Debug logs
  console.log('Assignments:', assignments);
  console.log('Selected Assignment:', selectedAssignment);
  console.log('Tasks:', tasks);

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
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
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
      console.log('Fetched Assignments:', data);
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
            const response = await fetch(`http://localhost:3000/api/assignments/${selectedAssignment}/tasks`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error(`Не удалось загрузить задачи: ${response.status}`);
            const data = await response.json();
            const processedTasks = data.map(task => ({
                ...task,
                status: getStatusById(Number(task.status_id)),
                priority: getPriorityById(Number(task.priority_id)),
                work_duration: Number(task.work_duration) || 0,
                due_date: task.deadline || new Date().toISOString(),
                isArchived: !!task.deleted_at
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
      const filteredComments = data.filter(comment => comment.author_email !== userEmail);
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

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'active') return !task.isArchived;
    if (taskFilter === 'archived') return task.isArchived;
    return true;
  });

  // Расчет статистики
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress').length;
  const notStartedTasks = filteredTasks.filter(task => task.status === 'new').length;
  const overdueTasks = filteredTasks.filter(task => new Date(task.due_date) < new Date() && task.status !== 'done').length;


  const getPerformanceMetrics = () => {
  // Реальная эффективность
  const efficiency = completionPercentage;
  
  // Продуктивность (отношение завершенных к общему числу)
  const productivity = Math.round((completedTasks / totalTasks) * 100);
  
  // Качество (меньше просроченных - выше качество)
  const quality = Math.max(0, 100 - (overdueTasks / totalTasks * 100));
  
  // Сроки (процент задач, выполненных вовремя)
  const onTimeTasks = filteredTasks.filter(task => 
    task.status === 'done' && 
    (!task.due_date || new Date(task.due_date) >= new Date(task.completed_at))
  ).length;
  const timeliness = totalTasks > 0 ? Math.round((onTimeTasks / totalTasks) * 100) : 0;
  
  // Сотрудничество (распределение задач между исполнителями)
  const performerCount = Object.keys(performersStats).length;
  const collaboration = performerCount > 0 
    ? Math.min(100, Math.round((completedTasks / performerCount) * 10)) 
    : 0;

  return [
    { subject: 'Эффективность', A: efficiency, fullMark: 100 },
    { subject: 'Продуктивность', A: productivity, fullMark: 100 },
    { subject: 'Качество', A: quality, fullMark: 100 },
    { subject: 'Сроки', A: timeliness, fullMark: 100 },
    { subject: 'Сотрудничество', A: collaboration, fullMark: 100 },
  ];
};

  const getWeeklyProgress = () => {
  const now = new Date();
  const weeks = [];
  
  // Создаем 4 недели (текущая и 3 предыдущие)
  for (let i = 3; i >= 0; i--) {
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (7 * (i + 1)));
    const endDate = new Date(now);
    endDate.setDate(now.getDate() - (7 * i));
    
    const weekTasks = filteredTasks.filter(task => {
      const created = new Date(task.created_at);
      return created >= startDate && created < endDate;
    });
    
    const weekCompleted = weekTasks.filter(task => task.status === 'done').length;
    
    weeks.push({
      name: `Неделя ${4-i}`,
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      total: weekTasks.length,
      completed: weekCompleted
    });
  }
  
  return weeks;
};

  const performersStats = filteredTasks.reduce((acc, task) => {
    if (task.assignee_email) {
      if (!acc[task.assignee_email]) {
        acc[task.assignee_email] = {
          name: task.assignee_name || task.assignee_email,
          total: 0,
          completed: 0,
          inProgress: 0,
          new: 0
        };
      }
      acc[task.assignee_email].total++;
      
      if (task.status === 'done') {
        acc[task.assignee_email].completed++;
      } else if (task.status === 'in_progress') {
        acc[task.assignee_email].inProgress++;
      } else if (task.status === 'new') {
        acc[task.assignee_email].new++;
      }
    }
    return acc;
  }, {});

  const performersData = Object.values(performersStats)
    .sort((a, b) => (b.completed / b.total) - (a.completed / a.total));

  const deadlineData = filteredTasks
    .filter(task => task.due_date)
    .map(task => ({
      name: task.title?.substring(0, 15) || 'Задача',
      deadline: new Date(task.due_date).getTime(),
      status: task.status,
      overdue: new Date(task.due_date) < new Date() && task.status !== 'done'
    }))
    .sort((a, b) => a.deadline - b.deadline);

  const formatDeadlineDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0; 
    const totalTime = filteredTasks.reduce((sum, task) => { 
        const duration = Number(task.work_duration) || 0; 
        return sum + (isNaN(duration) ? 0 : duration); 
    }, 0);

  const avgTimePerTask = totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0;

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

  const UsersPerformanceTable = ({ performersData }) => {
    return (
      <ChartCard>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PeopleIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Исполнители и выполненные задачи
          </Typography>
          {performersData.length > 0 ? (
            <>
              <TableContainer component={Paper} style={{ maxHeight: 400, overflowX: 'auto', width: '100%' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Исполнитель</TableCell>
                      <TableCell align="right">Всего задач</TableCell>
                      <TableCell align="right">Выполнено</TableCell>
                      <TableCell align="right">В работе</TableCell>
                      <TableCell align="right">% выполнения</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performersData.map((performer, index) => (
                      <TableRow key={index} hover>
                        <TableCell component="th" scope="row">
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                              {performer.name.charAt(0).toUpperCase()}
                            </Avatar>
                            {performer.name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{performer.total}</TableCell>
                        <TableCell align="right">
                          <Box color="success.main">{performer.completed}</Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box color="warning.main">{performer.inProgress}</Box>
                        </TableCell>
                        <TableCell align="right">
                          <LinearProgress
                            variant="determinate"
                            value={Math.round((performer.completed / performer.total) * 100)}
                            color={
                              Math.round((performer.completed / performer.total) * 100) > 75 ? 'success' :
                              Math.round((performer.completed / performer.total) * 100) > 50 ? 'warning' : 'error'
                            }
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2">
                            {Math.round((performer.completed / performer.total) * 100)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box mt={2} display="flex" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle2">Общая статистика:</Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={`Всего задач: ${performersData.reduce((sum, p) => sum + p.total, 0)}`}
                      color="default"
                      size="small"
                    />
                    <Chip
                      label={`Выполнено: ${performersData.reduce((sum, p) => sum + p.completed, 0)}`}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Лучшие исполнители:</Typography>
                  <Box display="flex" gap={1} mt={1}>
                    {performersData.slice(0, 2).map((performer, idx) => (
                      <Chip
                        key={idx}
                        label={`${performer.name}: ${Math.round((performer.completed / performer.total) * 100)}%`}
                        color={idx === 0 ? 'primary' : 'secondary'}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography color="textSecondary">Нет данных об исполнителях</Typography>
            </Box>
          )}
        </CardContent>
      </ChartCard>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} onCommentsClick={() => setShowNotification(true)} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} onCommentsClick={() => setShowNotification(true)} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      </PageContainer>
    );
  }

return (
  <PageContainer>
    <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} onCommentsClick={() => setShowNotification(true)} />

    {showNotification && (
      <TaskNotification
        tasks={tasks}
        comments={comments}
        onClose={() => setShowNotification(false)}
      />
    )}

    <ScrollableContainer>
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
            {/* Статистические карточки */}
            <Grid container spacing={3} style={{ marginBottom: '20px', width: '100%' }}>
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
            <Grid container spacing={3} style={{ width: '100%' }}>
              <Grid item xs={12} md={6}>
                <ChartCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Распределение задач по статусу</Typography>
                    {statusData.some(item => item.value > 0) ? (
                      <ResponsiveContainer width="100%" height={300} minWidth={300}>
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
                      <ResponsiveContainer width="100%" height={300} minWidth={300}>
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

            {/* График дедлайнов и таблица исполнителей */}
            <Grid container spacing={3} style={{ marginTop: '16px', width: '100%' }}>
              <Grid item xs={12} md={6}>
                <ChartCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <EventIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                      График дедлайнов
                    </Typography>
                    {deadlineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400} minWidth={300}>
                        <LineChart
                          data={deadlineData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            dataKey="deadline"
                            tickFormatter={(unixTime) => formatDeadlineDate(unixTime)}
                            domain={['auto', 'auto']}
                            hide
                          />
                          <Tooltip
                            formatter={(value) => [formatDeadlineDate(value), 'Дедлайн']}
                            labelFormatter={(label) => `Задача: ${label}`}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="deadline"
                            name="Дедлайн"
                            stroke="#8884d8"
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
                        <Typography color="textSecondary">Нет данных о дедлайнах</Typography>
                      </Box>
                    )}
                    {deadlineData.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2">Ближайшие дедлайны:</Typography>
                        <ul style={{ paddingLeft: 20 }}>
                          {deadlineData.slice(0, 3).map((task, index) => (
                            <li key={index}>
                              <Typography variant="body2" component="div">
                                {task.name}: {formatDeadlineDate(task.deadline)}
                                {task.overdue && (
                                  <Chip
                                    label="Просрочено"
                                    size="small"
                                    color="error"
                                    style={{ marginLeft: 8 }}
                                  />
                                )}
                              </Typography>
                            </li>
                          ))}
                        </ul>
                      </Box>
                    )}
                  </CardContent>
                </ChartCard>
              </Grid>

              <Grid item xs={12} md={6} style={{ minHeight: '500px' }}>
                <UsersPerformanceTable performersData={performersData} />
              </Grid>
            </Grid>

            {/* Дополнительные диаграммы */}
            <Grid container spacing={3} style={{ marginTop: '16px', width: '100%' }}>
              <Grid item xs={12} md={6}>
  <ChartCard>
    <CardContent>
      <Typography variant="h6" gutterBottom>Динамика выполнения</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={getWeeklyProgress()}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value, name,) => [
              `${value} задач`, 
              name === 'completed' ? 'Завершено' : 'Всего'
            ]}
labelFormatter={(label, props) => {
              const week = props?.payload;
              return week ? `${label} (${week.startDate} - ${week.endDate})` : label;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="completed" 
            stackId="1" 
            stroke="#8884d8" 
            fill="#8884d8" 
            name="Завершено" 
          />
          <Area 
            type="monotone" 
            dataKey="total" 
            stackId="2" 
            stroke="#82ca9d" 
            fill="#82ca9d" 
            name="Всего задач" 
          />
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
        <RadarChart outerRadius={90} data={getPerformanceMetrics()}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar 
            name="Производительность" 
            dataKey="A" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.6} 
          />
          <Legend />
          <Tooltip 
            formatter={(value, name, props) => [
              `${value}%`, 
              props.payload.subject
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
      <Box mt={2}>
        <Typography variant="caption" color="textSecondary">
          *Сотрудничество рассчитывается как равномерность распределения задач между исполнителями
        </Typography>
      </Box>
    </CardContent>
  </ChartCard>
</Grid>
            </Grid>

            {/* Распределение времени */}
           
          </>
        )}
      </ContentContainer>
          </ScrollableContainer>
    </PageContainer>

  );
};

export default Dashboard;
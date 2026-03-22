
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
} from 'recharts';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  LinearProgress,
  Button,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Header from '../components/Header';
import TaskNotification from '../components/TaskNotification';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PeopleIcon from '@mui/icons-material/People';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Dashboard.css';

const localizer = momentLocalizer(moment);

const STATUS_COLORS = {
  new: '#8e24aa',
  in_progress: '#2196f3',
  done: '#4caf50',
  rew: '#ff9800',
  failed: '#d32f2f',
  unknown: '#607d8b',
};

const STATUS_LABELS = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Завершено',
  rew: 'На ревью',
  failed: 'Провалено',
  unknown: 'Неизвестно',
};

const PRIORITY_COLORS = {
  high: '#ff6b6b',
  medium: '#ffd166',
  low: '#06d6a0',
};

const PageContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: '#f5f7fa',
});

const ScrollableContainer = styled('div')({
  flex: 1,
  overflowY: 'auto',
  paddingTop: '80px',
});

const ContentContainer = styled('div')({
  padding: '28px 32px 40px',
  width: '100%',
  boxSizing: 'border-box',
});

const DashboardTitle = styled(Typography)({
  marginBottom: '24px',
  color: '#1976d2',
  fontWeight: 700,
});

const StyledSelect = styled(Select)({
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  minWidth: '240px',
});

const MetricItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
});

const ChartContainer = styled('div')({
  width: '100%',
  height: '380px',
});

const cardSx = {
  borderRadius: 3,
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
  height: '100%',
};

const sectionTitleSx = {
  color: '#1976d2',
  mb: 2,
};

const performanceMetricDescriptions = {
  'Эффективность': 'Показывает долю завершённых задач среди всех задач, кроме тех, что находятся на ревью.',
  'Продуктивность': 'Учитывает завершённые задачи как основной вклад, а задачи на ревью и в работе добавляют частичный вклад.',
  'Качество': 'Снижается из-за проваленных задач и просрочек. Проваленные влияют сильнее, чем просто задержки.',
  'Сроки': 'Отражает, сколько задач закрыто вовремя и сколько текущих задач всё ещё укладываются в дедлайн.',
  'Согласованность': 'Оценивает баланс нагрузки по участникам команды и общий вклад команды в завершение задач.',
};

const getStatusById = (id) => ({
  1: 'new',
  2: 'in_progress',
  3: 'done',
  4: 'failed',
  5: 'rew',
}[id] || 'unknown');

const getPriorityById = (id) => ({
  1: 'low',
  2: 'medium',
  3: 'high',
}[id] || 'low');

const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.unknown;
const getStatusLabel = (status) => STATUS_LABELS[status] || STATUS_LABELS.unknown;

const toValidDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isCountedForCompletion = (task) => task.status !== 'rew';
const isOverdueTask = (task) => !!task.deadlineAt && new Date(task.deadlineAt) < new Date() && !['done', 'failed', 'rew'].includes(task.status);

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours > 0 ? `${hours}h` : null, mins > 0 || hours > 0 ? `${mins}m` : null, `${secs}s`]
    .filter(Boolean)
    .join(' ');
};

const formatDeadlineOffset = (daysLeft) => {
  if (daysLeft === 0) return 'Сегодня';
  if (daysLeft === 1) return 'Через 1 день';
  if (daysLeft > 1) return `Через ${daysLeft} дн.`;
  if (daysLeft === -1) return 'Просрочено на 1 день';
  return `Просрочено на ${Math.abs(daysLeft)} дн.`;
};

function CalendarToolbar({ date, view, onNavigate, onView }) {
  const title = view === 'month'
    ? moment(date).format('MMMM YYYY')
    : view === 'week'
      ? `${moment(date).startOf('week').format('D MMM')} - ${moment(date).endOf('week').format('D MMM YYYY')}`
      : `Список: ${moment(date).format('MMMM YYYY')}`;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap', mb: 2 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button variant="outlined" size="small" onClick={() => onNavigate('TODAY')}>Сегодня</Button>
        <Button variant="outlined" size="small" onClick={() => onNavigate('PREV')}>Назад</Button>
        <Button variant="outlined" size="small" onClick={() => onNavigate('NEXT')}>Вперёд</Button>
      </Stack>
      <Typography variant="h6" sx={{ textTransform: 'capitalize', color: '#1f3b64', fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button variant={view === 'month' ? 'contained' : 'outlined'} size="small" onClick={() => onView('month')}>Месяц</Button>
        <Button variant={view === 'week' ? 'contained' : 'outlined'} size="small" onClick={() => onView('week')}>Неделя</Button>
        <Button variant={view === 'agenda' ? 'contained' : 'outlined'} size="small" onClick={() => onView('agenda')}>Список</Button>
      </Stack>
    </Box>
  );
}

function CalendarBlock({ events, date, view, onNavigate, onView }) {
  if (!events.length) {
    return (
      <Box sx={{ height: 640, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="textSecondary">Для выбранного набора задач нет дедлайнов</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 640 }}>
      <Calendar
        localizer={localizer}
        events={events}
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        startAccessor="start"
        endAccessor="end"
        components={{
          toolbar: () => (
            <CalendarToolbar
              date={date}
              view={view}
              onNavigate={onNavigate}
              onView={onView}
            />
          ),
        }}
        views={['month', 'week', 'agenda']}
        messages={{
          today: 'Сегодня',
          previous: 'Назад',
          next: 'Вперёд',
          month: 'Месяц',
          week: 'Неделя',
          agenda: 'Список',
          date: 'Дата',
          time: 'Время',
          event: 'Событие',
          noEventsInRange: 'Нет дедлайнов в этом периоде',
          showMore: (n) => `+ ещё ${n}`,
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: getStatusColor(event.status),
            color: '#fff',
            border: 'none',
            borderRadius: 6,
          },
        })}
      />
    </Box>
  );
}

function Dashboard({ userEmail: propUserEmail }) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(propUserEmail || '');
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedAssignmentData, setSelectedAssignmentData] = useState(null);
  const [taskFilter, setTaskFilter] = useState('active');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [notificationTasks, setNotificationTasks] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [assignmentMetrics, setAssignmentMetrics] = useState(null);
  const lastNotificationCountRef = useRef(0);

  const onNavigate = useCallback((page) => navigate(`/${page}`), [navigate]);

  useEffect(() => {
    if (propUserEmail) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const decoded = JSON.parse(
        decodeURIComponent(
          atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
            .split('')
            .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
            .join('')
        )
      );
      if (decoded?.email) setUserEmail(decoded.email);
    } catch (decodeError) {
      console.error('Failed to decode token:', decodeError);
    }
  }, [propUserEmail]);

  const fetchAssignments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Пользователь не авторизован');
      const response = await fetch('http://localhost:3000/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Не удалось загрузить задания');
      const data = await response.json();
      setAssignments(data);
      if (data.length > 0) {
        setSelectedAssignment(data[0].id);
        setSelectedAssignmentData(data[0]);
      }
    } catch (fetchError) {
      setError(fetchError.message);
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
        `http://localhost:3000/api/assignments/${selectedAssignment}/tasks?include_archived=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`Не удалось загрузить задачи: ${response.status}`);
      const data = await response.json();
      setTasks(
        data.map((task) => {
          const deadlineDate = toValidDate(task.deadline || task.due_date || task.dueDate);
          return {
            ...task,
            status: task.status || getStatusById(Number(task.status_id)),
            priority: getPriorityById(Number(task.priority_id)),
            work_duration: Number(task.work_duration) || 0,
            due_date: deadlineDate ? deadlineDate.toISOString() : null,
            deadlineAt: deadlineDate ? deadlineDate.toISOString() : null,
            isArchived: !!task.deleted_at,
          };
        })
      );
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAssignment]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('http://localhost:3000/api/notifications/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setInvitations(Array.isArray(data.invitations) ? data.invitations : []);
      setNotificationTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setSystemNotifications(Array.isArray(data.systemNotifications) ? data.systemNotifications : []);
      setUnreadCommentsCount(Number(data?.counts?.total) || 0);
    } catch (fetchError) {
      console.error('Ошибка при загрузке уведомлений:', fetchError);
    }
  }, []);

  const fetchAssignmentMetrics = useCallback(async () => {
    if (!selectedAssignment) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(
        `http://localhost:3000/api/assignments/${selectedAssignment}/metrics?scope=${taskFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`Не удалось загрузить метрики: ${response.status}`);
      const data = await response.json();
      setAssignmentMetrics(data?.kpis || null);
    } catch (fetchError) {
      console.error('Ошибка при загрузке метрик проекта:', fetchError);
      setAssignmentMetrics(null);
    }
  }, [selectedAssignment, taskFilter]);

  useEffect(() => {
    fetchAssignments();
    fetchNotifications();
  }, [fetchAssignments, fetchNotifications]);

  useEffect(() => {
    if (!selectedAssignment) return;
    fetchTasks();
    const assignment = assignments.find((item) => item.id === selectedAssignment);
    if (assignment) setSelectedAssignmentData(assignment);
  }, [selectedAssignment, assignments, fetchTasks]);

  useEffect(() => {
    fetchAssignmentMetrics();
  }, [fetchAssignmentMetrics]);

  useEffect(() => {
    if (unreadCommentsCount > 0 && unreadCommentsCount > lastNotificationCountRef.current) {
      setShowNotification(true);
    }
    lastNotificationCountRef.current = unreadCommentsCount;
  }, [unreadCommentsCount]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'active') return tasks.filter((task) => !task.isArchived);
    if (taskFilter === 'archived') return tasks.filter((task) => task.isArchived);
    return tasks;
  }, [tasks, taskFilter]);

  const totalTasks = filteredTasks.length;
  const countedTasks = filteredTasks.filter(isCountedForCompletion);
  const completedTasks = filteredTasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = filteredTasks.filter((task) => task.status === 'in_progress').length;
  const newTasks = filteredTasks.filter((task) => task.status === 'new').length;
  const reviewTasks = filteredTasks.filter((task) => task.status === 'rew').length;
  const failedTasks = filteredTasks.filter((task) => task.status === 'failed').length;
  const overdueTasks = filteredTasks.filter(isOverdueTask).length;
  const localCompletionPercentage = countedTasks.length > 0 ? Math.round((completedTasks / countedTasks.length) * 100) : 0;
  const completionPercentage = assignmentMetrics?.efficiency ?? localCompletionPercentage;
  const totalTime = filteredTasks.reduce((sum, task) => sum + (Number(task.work_duration) || 0), 0);
  const avgTimePerTask = totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0;
  const fastestTaskTime = filteredTasks.length > 0 ? Math.min(...filteredTasks.map((task) => Number(task.work_duration) || 0)) : 0;
  const slowestTaskTime = filteredTasks.length > 0 ? Math.max(...filteredTasks.map((task) => Number(task.work_duration) || 0)) : 0;

  const priorityData = [
    { name: 'Высокий', value: filteredTasks.filter((task) => task.priority === 'high').length, color: PRIORITY_COLORS.high },
    { name: 'Средний', value: filteredTasks.filter((task) => task.priority === 'medium').length, color: PRIORITY_COLORS.medium },
    { name: 'Низкий', value: filteredTasks.filter((task) => task.priority === 'low').length, color: PRIORITY_COLORS.low },
  ];

  const statusData = [
    { name: 'Завершено', value: completedTasks, color: STATUS_COLORS.done },
    { name: 'В работе', value: inProgressTasks, color: STATUS_COLORS.in_progress },
    { name: 'Новые', value: newTasks, color: STATUS_COLORS.new },
    { name: 'На ревью', value: reviewTasks, color: STATUS_COLORS.rew },
    { name: 'Провалено', value: failedTasks, color: STATUS_COLORS.failed },
  ];

  const tasksWithDeadlines = filteredTasks
    .filter((task) => task.deadlineAt)
    .map((task) => ({ ...task, deadlineDate: new Date(task.deadlineAt) }))
    .filter((task) => !Number.isNaN(task.deadlineDate.getTime()))
    .sort((a, b) => a.deadlineDate - b.deadlineDate);

  const calendarEvents = tasksWithDeadlines.map((task) => ({
    id: task.id,
    title: task.title,
    start: task.deadlineDate,
    end: new Date(task.deadlineDate.getTime() + 30 * 60 * 1000),
    status: task.status,
  }));

  const deadlineData = tasksWithDeadlines
    .slice(0, 8)
    .map((task) => {
      const daysLeft = Math.ceil((task.deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        name: task.title?.substring(0, 26) || 'Задача',
        fullTitle: task.title || 'Задача',
        daysLeft,
        absoluteDays: Math.abs(daysLeft),
        timelineValue: daysLeft >= 0 ? Math.max(daysLeft, 0.5) : Math.max(Math.abs(daysLeft), 0.5),
        deadlineLabel: task.deadlineDate.toLocaleDateString('ru-RU'),
        status: task.status,
        offsetLabel: formatDeadlineOffset(daysLeft),
      };
    });

  const timePerTaskData = filteredTasks.map((task) => ({
    name: task.title?.substring(0, 22) || 'Задача',
    time: Number(task.work_duration) || 0,
    status: task.status,
  }));

  const performersData = Object.values(
    filteredTasks.reduce((acc, task) => {
      if (!task.assignee_email) return acc;
      if (!acc[task.assignee_email]) {
        acc[task.assignee_email] = {
          name: task.assignee_name || task.assignee_email,
          total: 0,
          completed: 0,
          inProgress: 0,
          review: 0,
          failed: 0,
        };
      }
      acc[task.assignee_email].total += 1;
      if (task.status === 'done') acc[task.assignee_email].completed += 1;
      if (task.status === 'in_progress') acc[task.assignee_email].inProgress += 1;
      if (task.status === 'rew') acc[task.assignee_email].review += 1;
      if (task.status === 'failed') acc[task.assignee_email].failed += 1;
      return acc;
    }, {})
  )
    .map((performer) => ({
      ...performer,
      completionRate: Math.round((performer.completed / Math.max(performer.total - performer.review, 1)) * 100),
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  const activityTimeline = useMemo(() => {
    if (!selectedAssignmentData?.created_at) return [];
    const assignmentStart = new Date(selectedAssignmentData.created_at);
    const assignmentEnd = selectedAssignmentData.deadline ? new Date(selectedAssignmentData.deadline) : new Date();
    const weeks = [];
    let currentWeekStart = new Date(assignmentStart);
    while (currentWeekStart <= assignmentEnd) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 7);
      const weekTasks = filteredTasks.filter((task) => {
        const created = new Date(task.created_at);
        return created >= currentWeekStart && created < currentWeekEnd;
      });
      weeks.push({
        name: moment(currentWeekStart).format('DD MMM'),
        completed: weekTasks.filter((task) => task.status === 'done').length,
        inProgress: weekTasks.filter((task) => task.status === 'in_progress').length,
        new: weekTasks.filter((task) => task.status === 'new').length,
        review: weekTasks.filter((task) => task.status === 'rew').length,
        failed: weekTasks.filter((task) => task.status === 'failed').length,
      });
      currentWeekStart = currentWeekEnd;
    }
    return weeks;
  }, [filteredTasks, selectedAssignmentData]);

  const weeklyProgress = useMemo(() => {
    const now = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i -= 1) {
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - (7 * (i + 1)));
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - (7 * i));
      const weekTasks = filteredTasks.filter((task) => {
        const created = new Date(task.created_at);
        return created >= startDate && created < endDate;
      });
      weeks.push({
        name: `Неделя ${4 - i}`,
        total: weekTasks.length,
        completed: weekTasks.filter((task) => task.status === 'done').length,
        review: weekTasks.filter((task) => task.status === 'rew').length,
        failed: weekTasks.filter((task) => task.status === 'failed').length,
      });
    }
    return weeks;
  }, [filteredTasks]);

  const performanceMetrics = useMemo(() => ([
    { subject: 'Эффективность', A: assignmentMetrics?.efficiency ?? 0, fullMark: 100 },
    { subject: 'Продуктивность', A: assignmentMetrics?.productivity ?? 0, fullMark: 100 },
    { subject: 'Качество', A: assignmentMetrics?.quality ?? 0, fullMark: 100 },
    { subject: 'Сроки', A: assignmentMetrics?.timeliness ?? 0, fullMark: 100 },
    { subject: 'Согласованность', A: assignmentMetrics?.collaboration ?? 0, fullMark: 100 },
  ]), [assignmentMetrics]);

  const handleAssignmentChange = (event) => {
    const assignmentId = event.target.value;
    setSelectedAssignment(assignmentId);
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (assignment) setSelectedAssignmentData(assignment);
  };

  const handleTaskFilterChange = (_, newFilter) => {
    if (newFilter) setTaskFilter(newFilter);
  };

  const handleCalendarNavigate = useCallback((nextDateOrAction) => {
    if (nextDateOrAction instanceof Date) {
      setCalendarDate(nextDateOrAction);
      return;
    }

    if (nextDateOrAction === 'TODAY') {
      setCalendarDate(new Date());
      return;
    }

    setCalendarDate((currentDate) => {
      const nextDate = new Date(currentDate);
      if (calendarView === 'month') {
        nextDate.setMonth(currentDate.getMonth() + (nextDateOrAction === 'NEXT' ? 1 : -1));
      } else if (calendarView === 'week') {
        nextDate.setDate(currentDate.getDate() + (nextDateOrAction === 'NEXT' ? 7 : -7));
      } else {
        nextDate.setDate(currentDate.getDate() + (nextDateOrAction === 'NEXT' ? 30 : -30));
      }
      return nextDate;
    });
  }, [calendarView]);

  const handleCalendarView = useCallback((nextView) => {
    setCalendarView(nextView);
  }, []);

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
      {showNotification && <TaskNotification tasks={notificationTasks} comments={comments} invitations={invitations} systemNotifications={systemNotifications} onClose={() => setShowNotification(false)} />}
      <ScrollableContainer>
        <ContentContainer>
          <DashboardTitle variant="h4">Дашборд проекта</DashboardTitle>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <FormControl fullWidth>
                <InputLabel id="assignment-select-label">Проект</InputLabel>
                <StyledSelect labelId="assignment-select-label" value={selectedAssignment} label="Проект" onChange={handleAssignmentChange}>
                  {assignments.map((assignment) => (
                    <MenuItem key={assignment.id} value={assignment.id}>{assignment.title}</MenuItem>
                  ))}
                </StyledSelect>
              </FormControl>
            </Grid>
            {selectedAssignment && tasks.length > 0 && (
              <Grid item xs={12} md={4}>
                <ToggleButtonGroup value={taskFilter} onChange={handleTaskFilterChange} exclusive fullWidth>
                  <ToggleButton value="active">Активные</ToggleButton>
                  <ToggleButton value="archived">Архив</ToggleButton>
                  <ToggleButton value="all">Все</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            )}
          </Grid>

          {!selectedAssignment && assignments.length === 0 && !loading && (
            <Typography variant="body1" sx={{ mt: 2 }}>Нет доступных заданий</Typography>
          )}

          {selectedAssignment && tasks.length === 0 && !loading && (
            <Typography variant="body1" sx={{ mt: 2 }}>Не найдено задач для выбранного задания</Typography>
          )}

          {selectedAssignment && tasks.length > 0 && (
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={sectionTitleSx}>Основные метрики</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Всего задач</Typography>
                        <Typography variant="h4" color="primary">{totalTasks}</Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <MetricItem><CheckCircleIcon color="success" fontSize="small" /><Typography variant="body2">Завершено: {completedTasks}</Typography></MetricItem>
                        <MetricItem><HourglassEmptyIcon color="warning" fontSize="small" /><Typography variant="body2">В работе: {inProgressTasks}</Typography></MetricItem>
                        <MetricItem><RateReviewIcon color="warning" fontSize="small" /><Typography variant="body2">На ревью: {reviewTasks}</Typography></MetricItem>
                        <MetricItem><ErrorIcon color="error" fontSize="small" /><Typography variant="body2">Провалено: {failedTasks}</Typography></MetricItem>
                        <MetricItem><ErrorIcon color="error" fontSize="small" /><Typography variant="body2">Просрочено: {overdueTasks}</Typography></MetricItem>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Процент выполнения</Typography>
                        <Typography variant="h4" color="primary">{completionPercentage}%</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                          Коэффициент считается по завершённым задачам
                          <br />
                          от всех задач, кроме тех, что находятся на ревью.
                          <br />
                          Задачи со статусом «Провалено» остаются в расчёте
                          <br />
                          и уменьшают итоговый процент.
                        </Typography>
                        <Box mt={2}>
                          <CircularProgress variant="determinate" value={completionPercentage} size={60} thickness={5} color={completionPercentage > 75 ? 'success' : completionPercentage > 50 ? 'warning' : 'error'} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Среднее время на задачу</Typography>
                        <Typography variant="h4" color="primary">{formatTime(avgTimePerTask)}</Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <MetricItem><AccessTimeIcon color="info" fontSize="small" /><Typography variant="body2">Общее время: {formatTime(totalTime)}</Typography></MetricItem>
                        <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                          <Chip label={`Быстрее всего: ${formatTime(fastestTaskTime)}`} size="small" color="success" />
                          <Chip label={`Дольше всего: ${formatTime(slowestTaskTime)}`} size="small" color="error" />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Задачи по приоритету</Typography>
                        <Box height={120}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={priorityData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                                {priorityData.filter((item) => item.value > 0).map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mt={1} gap={1}>
                          {priorityData.map((item) => (
                            <Chip key={item.name} label={`${item.name}: ${item.value}`} size="small" sx={{ backgroundColor: item.color, color: item.name === 'Средний' ? '#111' : '#fff' }} />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={sectionTitleSx}>Дедлайны</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom><EventIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />Календарь дедлайнов</Typography>
                        <CalendarBlock
                          events={calendarEvents}
                          date={calendarDate}
                          view={calendarView}
                          onNavigate={handleCalendarNavigate}
                          onView={handleCalendarView}
                        />
                        <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                          <Chip label="Новая" size="small" sx={{ backgroundColor: STATUS_COLORS.new, color: '#fff' }} />
                          <Chip label="В работе" size="small" sx={{ backgroundColor: STATUS_COLORS.in_progress, color: '#fff' }} />
                          <Chip label="На ревью" size="small" sx={{ backgroundColor: STATUS_COLORS.rew, color: '#fff' }} />
                          <Chip label="Провалено" size="small" sx={{ backgroundColor: STATUS_COLORS.failed, color: '#fff' }} />
                          <Chip label="Завершено" size="small" sx={{ backgroundColor: STATUS_COLORS.done, color: '#fff' }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom><EventIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />График предстоящих дедлайнов</Typography>
                        {deadlineData.length > 0 ? (
                          <ChartContainer style={{ height: 480 }}>
                            <ResponsiveContainer width={800} height="100%">
                              <BarChart data={deadlineData} layout="vertical" margin={{ top: 16, right: 32, left: 0, bottom: 12 }} barCategoryGap={14}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#edf2f7" />
                                <XAxis
                                  type="number"
                                  domain={[0, 'dataMax + 1']}
                                  tickFormatter={(value) => `${value} дн.`}
                                  tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                  dataKey="name"
                                  type="category"
                                  width={210}
                                  tick={{ fontSize: 12, fill: '#334155' }}
                                  tickFormatter={(value) => (value.length > 24 ? `${value.substring(0, 21)}...` : value)}
                                />
                                <Tooltip content={({ active, payload }) => {
                                  if (!active || !payload || !payload.length) return null;
                                  const task = payload[0].payload;
                                  return (
                                    <Box sx={{ background: '#fff', p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5, boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}>
                                      <Typography variant="subtitle2">{task.fullTitle}</Typography>
                                      <Typography variant="body2">Срок: {task.deadlineLabel}</Typography>
                                      <Typography variant="body2">{task.offsetLabel}</Typography>
                                      <Typography variant="body2" sx={{ color: getStatusColor(task.status) }}>{getStatusLabel(task.status)}</Typography>
                                    </Box>
                                  );
                                }} />
                                <Bar dataKey="timelineValue" barSize={18} radius={[0, 8, 8, 0]}>
                                  {deadlineData.map((entry) => (
                                    <Cell key={`${entry.name}-${entry.deadlineLabel}`} fill={getStatusColor(entry.status)} />
                                  ))}
                                </Bar>
                                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={2} label={{ value: 'Сегодня', position: 'insideTopRight', fill: '#64748b', fontSize: 12 }} />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        ) : (
                          <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="textSecondary">Нет задач с дедлайнами для отображения</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={sectionTitleSx}>Статусы задач</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={4}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Распределение задач по статусу</Typography>
                        <ChartContainer>
                          <ResponsiveContainer width={800} height="100%">
                            <PieChart>
                              <Pie data={statusData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                {statusData.filter((item) => item.value > 0).map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} задач`, 'Количество']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} lg={8}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Время, затраченное на задачу</Typography>
                        <ChartContainer style={{ height: 420 }}>
                          <ResponsiveContainer width={800} height="100%">
                            <BarChart data={timePerTaskData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" interval={0} tickFormatter={(value) => (value.length > 14 ? `${value.substring(0, 11)}...` : value)} />
                              <YAxis tickFormatter={(value) => formatTime(value)} width={90} />
                              <Tooltip formatter={(value) => [formatTime(Number(value)), 'Затраченное время']} labelFormatter={(value) => `Задача: ${value}`} />
                              <Bar dataKey="time" name="Затраченное время" radius={[4, 4, 0, 0]}>
                                {timePerTaskData.map((entry) => (
                                  <Cell key={`${entry.name}-${entry.time}`} fill={getStatusColor(entry.status)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={sectionTitleSx}>Динамика выполнения</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h5" gutterBottom>По периоду задания</Typography>
                        <ResponsiveContainer width={800} height={430}>
                          <AreaChart data={activityTimeline}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="completed" stroke={STATUS_COLORS.done} fill={STATUS_COLORS.done} name="Завершено" />
                            <Area type="monotone" dataKey="inProgress" stroke={STATUS_COLORS.in_progress} fill={STATUS_COLORS.in_progress} name="В работе" />
                            <Area type="monotone" dataKey="new" stroke={STATUS_COLORS.new} fill={STATUS_COLORS.new} name="Новые" />
                            <Area type="monotone" dataKey="review" stroke={STATUS_COLORS.rew} fill={STATUS_COLORS.rew} name="На ревью" />
                            <Area type="monotone" dataKey="failed" stroke={STATUS_COLORS.failed} fill={STATUS_COLORS.failed} name="Провалено" />
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h5" gutterBottom>Последние 4 недели</Typography>
                        <ResponsiveContainer width={800} height={430}>
                          <AreaChart data={weeklyProgress}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="total" stroke="#82ca9d" fill="#82ca9d" name="Всего задач" />
                            <Area type="monotone" dataKey="completed" stroke={STATUS_COLORS.done} fill={STATUS_COLORS.done} name="Завершено" />
                            <Area type="monotone" dataKey="review" stroke={STATUS_COLORS.rew} fill={STATUS_COLORS.rew} name="На ревью" />
                            <Area type="monotone" dataKey="failed" stroke={STATUS_COLORS.failed} fill={STATUS_COLORS.failed} name="Провалено" />
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={8}>
                    <Typography variant="h4" gutterBottom sx={sectionTitleSx}>Производительность</Typography>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Показатели производительности</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          Это составная оценка по пяти осям. Ниже есть краткая расшифровка, чтобы было понятно, откуда берётся каждый коэффициент.
                        </Typography>
                        <ResponsiveContainer width="100%" height={380}>
                          <RadarChart outerRadius={130} data={performanceMetrics}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Производительность" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                        <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                          {performanceMetrics.map((metric) => (
                            <Box key={metric.subject} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f8fafc', border: '1px solid #e6edf5' }}>
                              <Typography variant="subtitle2" sx={{ color: '#1f3b64', fontWeight: 700 }}>
                                {metric.subject}: {metric.A}%
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {performanceMetricDescriptions[metric.subject]}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} lg={4}>
                    <Typography variant="h4" gutterBottom sx={sectionTitleSx}>Работа команды</Typography>
                    <Card sx={cardSx}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom><PeopleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />Исполнители и выполненные задачи</Typography>
                        {performersData.length > 0 ? (
                          <>
                            <TableContainer component={Paper} sx={{ maxHeight: 430, overflowX: 'auto' }}>
                              <Table stickyHeader size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Исполнитель</TableCell>
                                    <TableCell align="right">Всего</TableCell>
                                    <TableCell align="right">Готово</TableCell>
                                    <TableCell align="right">Ревью</TableCell>
                                    <TableCell align="right">Провалено</TableCell>
                                    <TableCell align="right">% эффективности</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {performersData.map((performer) => (
                                    <TableRow key={performer.name} hover>
                                      <TableCell>
                                        <Box display="flex" alignItems="center">
                                          <Avatar sx={{ width: 24, height: 24, mr: 1 }}>{performer.name.charAt(0).toUpperCase()}</Avatar>
                                          {performer.name}
                                        </Box>
                                      </TableCell>
                                      <TableCell align="right">{performer.total}</TableCell>
                                      <TableCell align="right"><Box color="success.main">{performer.completed}</Box></TableCell>
                                      <TableCell align="right"><Box color="info.main">{performer.review}</Box></TableCell>
                                      <TableCell align="right"><Box color="error.main">{performer.failed}</Box></TableCell>
                                      <TableCell align="right" sx={{ minWidth: 140 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={performer.completionRate}
                                          color={performer.completionRate > 75 ? 'success' : performer.completionRate > 50 ? 'warning' : 'error'}
                                          sx={{ height: 8, borderRadius: 4 }}
                                        />
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                          {performer.completionRate}%
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                              <Chip label={`Всего: ${performersData.reduce((sum, p) => sum + p.total, 0)}`} size="small" />
                              <Chip label={`Ревью: ${performersData.reduce((sum, p) => sum + p.review, 0)}`} size="small" color="warning" />
                              <Chip label={`Провалено: ${performersData.reduce((sum, p) => sum + p.failed, 0)}`} size="small" color="error" />
                            </Box>
                          </>
                        ) : (
                          <Box display="flex" justifyContent="center" alignItems="center" height={220}>
                            <Typography color="textSecondary">Нет данных об исполнителях</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </ContentContainer>
      </ScrollableContainer>
    </PageContainer>
  );
}

export default Dashboard;


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Grid, Typography, CircularProgress, Box, Avatar,
  Chip, Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import Header from '../components/Header';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RateReviewIcon from '@mui/icons-material/RateReview';

const PageContainer = styled('div')({
  backgroundColor: '#f5f7fa',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100%',
  overflow: 'hidden',
});

const ScrollableContainer = styled('div')({
  width: '100%',
  overflowY: 'auto',
  flex: 1,
  paddingTop: '80px',
});

const ContentContainer = styled('div')({
  padding: '28px 32px 40px',
  width: '100%',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
});

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  width: '100%',
  borderRadius: '16px',
  transition: 'transform 0.25s, box-shadow 0.25s',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[5],
  },
}));

const ChartCard = styled(Card)({
  width: '100%',
  height: '100%',
  borderRadius: '16px',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)',
});

const MetricItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  width: '100%',
});

const STATUS_COLORS = {
  done: '#4caf50',
  inProgress: '#2196f3',
  new: '#8e24aa',
  review: '#ff9800',
  failed: '#d32f2f',
  overdue: '#ef4444',
};

const performanceMetricDescriptions = {
  'Эффективность': 'Показывает долю завершённых задач среди всех задач, которые участвуют в расчёте.',
  'Продуктивность': 'Учитывает завершённые задачи как основной вклад, а задачи на ревью и в работе как частичный прогресс.',
  'Качество': 'Снижается из-за проваленных задач и просрочек. Проваленные задачи влияют сильнее.',
  'Сроки': 'Показывает, насколько стабильно пользователь укладывается в дедлайны и не копит просрочки.',
  'Стабильность': 'Оценивает, насколько ровно пользователь доводит задачи до результата без срывов.',
};

const normalizeMetrics = (data) => {
  if (!data) return data;
  const out = JSON.parse(JSON.stringify(data));

  if (out.performance) {
    const p = out.performance;
    p.completionRate = p.completionRate ?? p.completion_rate ?? p.completion ?? 0;
    p.avgWorkTime = p.avgWorkTime ?? p.avg_work_time ?? p.avg_work_time_seconds ?? p.avg_work_time_sec ?? 0;
    p.totalWorkTime = p.totalWorkTime ?? p.total_work_time ?? p.total_work_time_seconds ?? 0;
    p.failedTasks = p.failedTasks ?? p.failed_tasks ?? 0;
    p.deletedFailedTasks = p.deletedFailedTasks ?? p.deleted_failed_tasks ?? 0;
    p.deletedFailedPenalty = p.deletedFailedPenalty ?? p.deleted_failed_penalty ?? 0;
    p.effectiveTotal = p.effectiveTotal ?? p.effective_total ?? p.effectiveTotal;
    if (p.kpis) {
      Object.keys(p.kpis).forEach((k) => {
        p.kpis[k] = p.kpis[k] ?? 0;
      });
    }
  }

  if (out.tasks) {
    const t = out.tasks;
    t.total = t.total ?? t.total_tasks ?? 0;
    t.completed = t.completed ?? t.completed_tasks ?? 0;
    t.inProgress = t.inProgress ?? t.in_progress ?? t.inprogress ?? 0;
    t.new = t.new ?? t.new_tasks ?? t['new'] ?? 0;
    t.review = t.review ?? t.on_review ?? t.review_tasks ?? 0;
    t.overdue = t.overdue ?? t.overdue_tasks ?? t.overdue ?? 0;
  }

  return out;
};

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds <= 0) return '0м';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
};

const UserInfoPage = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [userMetrics, setUserMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);

  const onNavigate = useCallback((page) => {
    navigate(`/${page}`);
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''));
      const decoded = JSON.parse(jsonPayload);
      if (decoded?.email) setUserEmail(decoded.email);
      if (decoded?.userId) setUserId(decoded.userId);
    } catch (decodeError) {
      console.error('Failed to decode token:', decodeError);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchUserMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/users/${userId}/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Не удалось загрузить метрики пользователя');

        const data = await response.json();
        setUserMetrics(normalizeMetrics(data));
      } catch (fetchError) {
        console.error('Ошибка при загрузке метрик:', fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserMetrics();
  }, [userId]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch('http://localhost:3000/api/comments/unread/count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCommentsCount(data.unread_count);
        }
      } catch (fetchError) {
        console.error('Ошибка при загрузке уведомлений:', fetchError);
      }
    };

    fetchUnreadCount();
  }, []);

  const performanceMetrics = useMemo(() => {
    if (!userMetrics) return [];

    const kpis = userMetrics.performance?.kpis || {};

    return [
      { subject: 'Эффективность', A: kpis.efficiency ?? 0, fullMark: 100 },
      { subject: 'Продуктивность', A: kpis.productivity ?? 0, fullMark: 100 },
      { subject: 'Качество', A: kpis.quality ?? 0, fullMark: 100 },
      { subject: 'Сроки', A: kpis.timeliness ?? 0, fullMark: 100 },
      { subject: 'Стабильность', A: kpis.stability ?? 0, fullMark: 100 },
    ];
  }, [userMetrics]);

  const tasksByStatusData = useMemo(() => {
    if (!userMetrics) return [];

    return [
      { name: 'Завершено', value: userMetrics.tasks.completed, fill: STATUS_COLORS.done },
      { name: 'В работе', value: userMetrics.tasks.inProgress, fill: STATUS_COLORS.inProgress },
      { name: 'Новые', value: userMetrics.tasks.new, fill: STATUS_COLORS.new },
      { name: 'На ревью', value: userMetrics.tasks.review || 0, fill: STATUS_COLORS.review },
      { name: 'Провалено', value: userMetrics.performance.failedTasks || 0, fill: STATUS_COLORS.failed },
      { name: 'Просрочено', value: userMetrics.tasks.overdue, fill: STATUS_COLORS.overdue },
    ].filter((item) => item.value > 0);
  }, [userMetrics]);

  if (loading) {
    return (
      <PageContainer>
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header userEmail={userEmail} onNavigate={onNavigate} unreadCommentsCount={unreadCommentsCount} />
      <ScrollableContainer>
        <ContentContainer>
          <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 44, height: 44 }}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            Профиль пользователя
          </Typography>

          {userMetrics && (
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>Основная информация</Typography>
                <Card sx={{ borderRadius: 4, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)' }}>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" gutterBottom><strong>Email:</strong> {userMetrics.user.email}</Typography>
                        <Typography variant="body1" gutterBottom><strong>Имя:</strong> {userMetrics.user.name || 'Не указано'}</Typography>
                        <Typography variant="body1" gutterBottom><strong>GitHub:</strong> {userMetrics.user.github_connected ? 'Подключен' : 'Не подключен'}</Typography>
                        {userMetrics.user.github_connected && <Typography variant="body1" gutterBottom><strong>GitHub username:</strong> {userMetrics.user.github_username}</Typography>}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" gutterBottom><strong>Дата регистрации:</strong> {new Date(userMetrics.user.created_at).toLocaleDateString('ru-RU')}</Typography>
                        <Typography variant="body1" gutterBottom><strong>Всего задач:</strong> {userMetrics.tasks.total}</Typography>
                        <Typography variant="body1" gutterBottom><strong>Процент выполнения:</strong> {userMetrics.performance.completionRate}%</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>Метрики задач</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>Всего задач</Typography><Typography variant="h4" color="primary">{userMetrics.tasks.total}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><AssignmentIcon color="primary" fontSize="small" /><Typography variant="body2">Все задачи пользователя</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>Завершено</Typography><Typography variant="h4" color="success.main">{userMetrics.tasks.completed}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><CheckCircleIcon color="success" fontSize="small" /><Typography variant="body2">{userMetrics.tasks.total > 0 ? Math.round((userMetrics.tasks.completed / userMetrics.tasks.total) * 100) : 0}% от общего числа</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>В работе</Typography><Typography variant="h4" color="info.main">{userMetrics.tasks.inProgress}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><HourglassEmptyIcon color="info" fontSize="small" /><Typography variant="body2">Активные задачи</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>На ревью</Typography><Typography variant="h4" sx={{ color: STATUS_COLORS.review }}>{userMetrics.tasks.review || 0}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><RateReviewIcon sx={{ color: STATUS_COLORS.review }} fontSize="small" /><Typography variant="body2">Ожидают подтверждения</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>Провалено</Typography><Typography variant="h4" sx={{ color: STATUS_COLORS.failed }}>{userMetrics.performance.failedTasks || 0}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><ErrorIcon sx={{ color: STATUS_COLORS.failed }} fontSize="small" /><Typography variant="body2">Неудачные задачи</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>Просрочено</Typography><Typography variant="h4" color="error.main">{userMetrics.tasks.overdue}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><ErrorIcon color="error" fontSize="small" /><Typography variant="body2">Требуют внимания</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>Статистика времени</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>Общее время работы</Typography><Typography variant="h4" color="primary">{formatTime(userMetrics.performance.totalWorkTime)}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><AccessTimeIcon color="primary" fontSize="small" /><Typography variant="body2">Накоплено за все задачи</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <StatsCard><CardContent><Typography color="textSecondary" gutterBottom>Среднее время на задачу</Typography><Typography variant="h4" color="primary">{formatTime(userMetrics.performance.avgWorkTime)}</Typography><Divider sx={{ my: 1.5 }} /><MetricItem><TrendingUpIcon color="primary" fontSize="small" /><Typography variant="body2">Средний показатель по задачам</Typography></MetricItem></CardContent></StatsCard>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>Производительность</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={7}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Показатели эффективности</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          Это составная оценка по ключевым направлениям работы. Под графиком есть расшифровка, чтобы было понятно, откуда берётся каждый показатель.
                        </Typography>
                        <ResponsiveContainer width="100%" height={380}>
                          <RadarChart outerRadius={120} data={performanceMetrics}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Ваши показатели" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                        <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                          {performanceMetrics.map((metric) => (
                            <Box key={metric.subject} sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#f8fafc', border: '1px solid #e6edf5' }}>
                              <Typography variant="subtitle2" sx={{ color: '#1f3b64', fontWeight: 700 }}>{metric.subject}: {metric.A}%</Typography>
                              <Typography variant="body2" color="textSecondary">{performanceMetricDescriptions[metric.subject]}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </ChartCard>
                  </Grid>
                  <Grid item xs={12} lg={5}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Задачи по статусам</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          График показывает текущую структуру задач пользователя по всем ключевым статусам.
                        </Typography>
                        <ResponsiveContainer width="100%" height={420}>
                          <BarChart data={tasksByStatusData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }} formatter={(value) => [`${value} задач`, 'Количество']} />
                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                              {tasksByStatusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {tasksByStatusData.map((entry) => <Chip key={entry.name} label={`${entry.name}: ${entry.value}`} size="small" sx={{ backgroundColor: entry.fill, color: '#fff' }} />)}
                        </Box>
                      </CardContent>
                    </ChartCard>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </ContentContainer>
      </ScrollableContainer>
    </PageContainer>
  );
};

export default UserInfoPage;

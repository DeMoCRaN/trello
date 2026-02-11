import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Grid, Typography, CircularProgress, Box, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, LinearProgress, Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import Header from '../components/Header';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorIcon from '@mui/icons-material/Error';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

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
  paddingTop: '80px',
});

const ContentContainer = styled('div')({
  padding: '24px',
  width: '100%',
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
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
  display: 'flex',
  flexDirection: 'column',
});

const MetricItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
  width: '100%'
});

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === 0) return '0м';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}ч ${mins}м`;
  }
  return `${mins}м`;
};

const UserInfoPage = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [userMetrics, setUserMetrics] = useState(null);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);

  const onNavigate = useCallback((page) => {
    navigate(`/${page}`);
  }, [navigate]);

  // Получаем email и userId из токена
  useEffect(() => {
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
        if (decoded?.userId) {
          setUserId(decoded.userId);
        }
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
  }, []);

  // Загружаем метрики пользователя
  useEffect(() => {
    if (!userId) return;

    const fetchUserMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3000/api/users/${userId}/metrics`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Не удалось загрузить метрики пользователя');
        }

        const data = await response.json();
        setUserMetrics(data);
      } catch (err) {
        console.error('Ошибка при загрузке метрик:', err);
        setError(err.message);
      }
    };

    fetchUserMetrics();
  }, [userId]);

  // Загружаем топ-10 пользователей
  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching top performers, token:', token ? 'exists' : 'missing');
        
        const response = await fetch('http://localhost:3000/api/users/top-performers', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Top performers response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Top performers error response:', errorText);
          throw new Error('Не удалось загрузить топ пользователей');
        }

        const data = await response.json();
        console.log('Top performers data:', data);
        setTopPerformers(data);
      } catch (err) {
        console.error('Ошибка при загрузке топ пользователей:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPerformers();
  }, []);


  // Загружаем количество непрочитанных комментариев
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('http://localhost:3000/api/comments/unread/count', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUnreadCommentsCount(data.unread_count);
        }
      } catch (error) {
        console.error('Ошибка при загрузке уведомлений:', error);
      }
    };

    fetchUnreadCount();
  }, []);

  // Данные для радар-графика производительности
  const getPerformanceMetrics = () => {
    if (!userMetrics) return [];
    
    const { tasks, performance } = userMetrics;
    const completionRate = performance.completionRate;
    const productivity = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;
    const quality = Math.max(0, 100 - (tasks.overdue / Math.max(tasks.total, 1) * 100));
    const timeliness = tasks.completed > 0 
      ? Math.round(((tasks.completed - tasks.overdue) / tasks.completed) * 100) 
      : 0;
    
    return [
      { subject: 'Эффективность', A: completionRate, fullMark: 100 },
      { subject: 'Продуктивность', A: productivity, fullMark: 100 },
      { subject: 'Качество', A: quality, fullMark: 100 },
      { subject: 'Сроки', A: timeliness, fullMark: 100 },
      { subject: 'Активность', A: Math.min(100, tasks.total * 5), fullMark: 100 },
    ];
  };

  // Данные для графика задач по статусам
  const getTasksByStatusData = () => {
    if (!userMetrics) return [];
    
    return [
      { name: 'Завершено', value: userMetrics.tasks.completed, fill: '#4caf50' },
      { name: 'В работе', value: userMetrics.tasks.inProgress, fill: '#2196f3' },
      { name: 'Новые', value: userMetrics.tasks.new, fill: '#ff9800' },
      { name: 'Просрочено', value: userMetrics.tasks.overdue, fill: '#f44336' },
    ].filter(item => item.value > 0);
  };

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
          <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', mb: 3, fontWeight: 600 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 40, height: 40, mr: 2, display: 'inline-flex' }}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            Профиль пользователя
          </Typography>

          {userMetrics && (
            <>
              {/* Основная информация о пользователе */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
                  Основная информация
                </Typography>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" gutterBottom>
                          <strong>Email:</strong> {userMetrics.user.email}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          <strong>Имя:</strong> {userMetrics.user.name || 'Не указано'}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          <strong>GitHub:</strong> {userMetrics.user.github_connected ? 'Подключен' : 'Не подключен'}
                        </Typography>
                        {userMetrics.user.github_connected && (
                          <Typography variant="body1" gutterBottom>
                            <strong>GitHub username:</strong> {userMetrics.user.github_username}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body1" gutterBottom>
                          <strong>Дата регистрации:</strong> {new Date(userMetrics.user.created_at).toLocaleDateString('ru-RU')}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          <strong>Общее количество задач:</strong> {userMetrics.tasks.total}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          <strong>Процент выполнения:</strong> {userMetrics.performance.completionRate}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>

              {/* Метрики задач */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
                  Метрики задач
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Всего задач</Typography>
                        <Typography variant="h4" component="div" color="primary">
                          {userMetrics.tasks.total}
                        </Typography>
                        <Divider style={{ margin: '12px 0' }} />
                        <MetricItem>
                          <AssignmentIcon color="primary" fontSize="small" />
                          <Typography variant="body2">Всего назначено</Typography>
                        </MetricItem>
                      </CardContent>
                    </StatsCard>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Завершено</Typography>
                        <Typography variant="h4" component="div" color="success">
                          {userMetrics.tasks.completed}
                        </Typography>
                        <Divider style={{ margin: '12px 0' }} />
                        <MetricItem>
                          <CheckCircleIcon color="success" fontSize="small" />
                          <Typography variant="body2">
                            {userMetrics.tasks.total > 0 
                              ? Math.round((userMetrics.tasks.completed / userMetrics.tasks.total) * 100) 
                              : 0}% от общего числа
                          </Typography>
                        </MetricItem>
                      </CardContent>
                    </StatsCard>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>В работе</Typography>
                        <Typography variant="h4" component="div" color="info">
                          {userMetrics.tasks.inProgress}
                        </Typography>
                        <Divider style={{ margin: '12px 0' }} />
                        <MetricItem>
                          <HourglassEmptyIcon color="info" fontSize="small" />
                          <Typography variant="body2">Активных задач</Typography>
                        </MetricItem>
                      </CardContent>
                    </StatsCard>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <StatsCard>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Просрочено</Typography>
                        <Typography variant="h4" component="div" color="error">
                          {userMetrics.tasks.overdue}
                        </Typography>
                        <Divider style={{ margin: '12px 0' }} />
                        <MetricItem>
                          <ErrorIcon color="error" fontSize="small" />
                          <Typography variant="body2">Требуют внимания</Typography>
                        </MetricItem>
                      </CardContent>
                    </StatsCard>
                  </Grid>
                </Grid>
              </Box>

              {/* Время работы */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
                  Статистика времени
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <StatsCard>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Общее время работы</Typography>
                        <Typography variant="h4" component="div" color="primary">
                          {formatTime(userMetrics.performance.totalWorkTime)}
                        </Typography>
                        <Divider style={{ margin: '12px 0' }} />
                        <MetricItem>
                          <AccessTimeIcon color="primary" fontSize="small" />
                          <Typography variant="body2">Накоплено за все задачи</Typography>
                        </MetricItem>
                      </CardContent>
                    </StatsCard>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <StatsCard>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>Среднее время на задачу</Typography>
                        <Typography variant="h4" component="div" color="primary">
                          {formatTime(userMetrics.performance.avgWorkTime)}
                        </Typography>
                        <Divider style={{ margin: '12px 0' }} />
                        <MetricItem>
                          <TrendingUpIcon color="primary" fontSize="small" />
                          <Typography variant="body2">Средний показатель</Typography>
                        </MetricItem>
                      </CardContent>
                    </StatsCard>
                  </Grid>
                </Grid>
              </Box>

              {/* Графики производительности */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
                  Производительность
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Показатели эффективности</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart outerRadius={90} data={getPerformanceMetrics()}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar 
                              name="Ваши показатели" 
                              dataKey="A" 
                              stroke="#8884d8" 
                              fill="#8884d8" 
                              fillOpacity={0.6} 
                            />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </ChartCard>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <ChartCard>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Задачи по статусам</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getTasksByStatusData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </ChartCard>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}

          {/* Топ-10 пользователей */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', mb: 2 }}>
              <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Топ-10 пользователей по производительности
            </Typography>
            <ChartCard>
              <CardContent>
                {topPerformers.length > 0 ? (
                  <TableContainer component={Paper} style={{ maxHeight: 600, overflowX: 'auto' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="center">Место</TableCell>
                          <TableCell>Пользователь</TableCell>
                          <TableCell align="right">Всего задач</TableCell>
                          <TableCell align="right">Выполнено</TableCell>
                          <TableCell align="right">% выполнения</TableCell>
                          <TableCell align="right">В срок</TableCell>
                          <TableCell align="right">KPI</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topPerformers.map((performer, index) => (
                          <TableRow 
                            key={performer.id} 
                            hover
                            sx={{ 
                              backgroundColor: performer.email === userEmail ? 'rgba(25, 118, 210, 0.1)' : 'inherit',
                              fontWeight: performer.email === userEmail ? 'bold' : 'normal'
                            }}
                          >
                            <TableCell align="center">
                              {index === 0 ? (
                                <Chip icon={<EmojiEventsIcon />} label="1" color="warning" size="small" />
                              ) : index === 1 ? (
                                <Chip icon={<EmojiEventsIcon />} label="2" color="default" size="small" sx={{ bgcolor: '#c0c0c0', color: 'white' }} />
                              ) : index === 2 ? (
                                <Chip icon={<EmojiEventsIcon />} label="3" color="default" size="small" sx={{ bgcolor: '#cd7f32', color: 'white' }} />
                              ) : (
                                <Typography variant="body2">{index + 1}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: performer.email === userEmail ? '#1976d2' : '#757575' }}>
                                  {(performer.name || performer.email).charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={performer.email === userEmail ? 'bold' : 'normal'}>
                                    {performer.name || performer.email}
                                  </Typography>
                                  {performer.email === userEmail && (
                                    <Typography variant="caption" color="primary">(Вы)</Typography>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="right">{performer.total_tasks}</TableCell>
                            <TableCell align="right">
                              <Box color="success.main">{performer.completed_tasks}</Box>
                            </TableCell>
                            <TableCell align="right">
                              <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                <LinearProgress
                                  variant="determinate"
                                  value={parseFloat(performer.completion_rate)}
                                  sx={{ 
                                    width: 60, 
                                    height: 8, 
                                    borderRadius: 4,
                                    bgcolor: '#e0e0e0'
                                  }}
                                  color={parseFloat(performer.completion_rate) > 75 ? 'success' : parseFloat(performer.completion_rate) > 50 ? 'warning' : 'error'}
                                />
                                <Typography variant="body2">{performer.completion_rate}%</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={`${performer.on_time_rate}%`} 
                                size="small"
                                color={parseFloat(performer.on_time_rate) > 80 ? 'success' : parseFloat(performer.on_time_rate) > 60 ? 'warning' : 'error'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={performer.kpi_score} 
                                size="small"
                                color={parseFloat(performer.kpi_score) > 80 ? 'success' : parseFloat(performer.kpi_score) > 60 ? 'primary' : 'default'}
                                sx={{ 
                                  fontWeight: 'bold',
                                  bgcolor: parseFloat(performer.kpi_score) > 80 ? '#4caf50' : parseFloat(performer.kpi_score) > 60 ? '#1976d2' : '#757575',
                                  color: 'white'
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                    <Typography color="textSecondary">Нет данных о пользователях</Typography>
                  </Box>
                )}
              </CardContent>
            </ChartCard>
          </Box>
        </ContentContainer>
      </ScrollableContainer>
    </PageContainer>
  );
};

export default UserInfoPage;

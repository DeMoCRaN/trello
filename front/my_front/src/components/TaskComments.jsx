import React, { useEffect, useState } from 'react';
import './TaskComments.css';

function TaskComments({ taskId, token }) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Триггер для обновления

  useEffect(() => {
    const fetchComments = async () => {
      if (!taskId || !token) return;
      
      setIsFetching(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/comments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Ожидался JSON, но получили: ${text.substring(0, 100)}`);
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка при загрузке комментариев');
        }
        
        const data = await response.json();
        setComments(data);
      } catch (err) {
        console.error('Ошибка при загрузке комментариев:', err);
        setError(err.message || 'Не удалось загрузить комментарии');
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchComments();
  }, [taskId, token, refreshTrigger]); // Добавляем refreshTrigger в зависимости

  const handleAddComment = async () => {
    if (!newCommentText.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ text: newCommentText }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Ожидался JSON, но получили: ${text.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при добавлении комментария');
      }
      
      // Вместо ручного добавления комментария, триггерим обновление списка
      setNewCommentText('');
      setRefreshTrigger(prev => prev + 1); // Обновляем триггер для повторного запроса
    } catch (err) {
      console.error('Ошибка при добавлении комментария:', err);
      setError(err.message || 'Не удалось добавить комментарий');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comments-section">
      <h3>Комментарии</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      {isFetching ? (
        <div className="loading">Загрузка комментариев...</div>
      ) : (
        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="no-comments">Нет комментариев</div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{comment.user_email}</span>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="comment-text">{comment.text}</div>
              </div>
            ))
          )}
        </div>
      )}
      
      <div className="comment-form">
        <textarea
          className="comment-input"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Напишите комментарий..."
          rows={3}
          disabled={loading}
        />
        <button
          className="comment-submit"
          onClick={handleAddComment}
          disabled={loading || !newCommentText.trim()}
        >
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </div>
  );
}

export default TaskComments;
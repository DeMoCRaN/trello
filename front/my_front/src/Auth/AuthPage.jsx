
import LoginForm from '../LoginForm/LoginForm';

const AuthPage = () => {
    return (
        <div className='auth-container'>
            <div className='auth-block'>
             <h1>Авторизация</h1>
             <LoginForm />
         </div>
        </div>
      );
    };

export default AuthPage;
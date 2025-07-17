import './App.css'
import AuthPage from './Auth/AuthPage'
import {BrowserRouter, Route, Routes} from 'react-router-dom'

const App = () => {
  return (
    <BrowserRouter> 
      <Routes>
        <Route path="/" element={<AuthPage />} />
      </Routes>
    </BrowserRouter> 
  );
};

export default App;

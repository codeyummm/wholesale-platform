import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [autoMode, setAutoMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedAutoMode = localStorage.getItem('autoMode');
    
    if (savedAutoMode === 'false') {
      setAutoMode(false);
      setTheme(savedTheme || 'light');
    } else {
      setAutoMode(true);
      applyAutoTheme();
    }
  }, []);

  const applyAutoTheme = () => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const hour = new Date().getHours();
    const isNightTime = hour >= 19 || hour < 7;
    const shouldBeDark = systemPrefersDark || isNightTime;
    setTheme(shouldBeDark ? 'dark' : 'light');
  };

  useEffect(() => {
    if (autoMode) {
      applyAutoTheme();
      const interval = setInterval(applyAutoTheme, 3600000);
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyAutoTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        clearInterval(interval);
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [autoMode]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setAutoMode(false);
    localStorage.setItem('autoMode', 'false');
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const enableAutoMode = () => {
    setAutoMode(true);
    localStorage.setItem('autoMode', 'true');
    applyAutoTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, autoMode, enableAutoMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
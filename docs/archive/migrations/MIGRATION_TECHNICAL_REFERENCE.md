# Migration Technical Reference

Technical patterns, best practices, and architectural decisions for the frontend migration.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Naming Conventions](#naming-conventions)
4. [Component Patterns](#component-patterns)
5. [State Management](#state-management)
6. [Routing](#routing)
7. [API Integration](#api-integration)
8. [Styling](#styling)
9. [Testing](#testing)
10. [TypeScript Guidelines](#typescript-guidelines)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│           Browser (Client)                   │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │      React Application              │    │
│  │  ┌──────────────────────────────┐  │    │
│  │  │     Pages (Route Components) │  │    │
│  │  └──────────────────────────────┘  │    │
│  │  ┌──────────────────────────────┐  │    │
│  │  │   Reusable Components        │  │    │
│  │  └──────────────────────────────┘  │    │
│  │  ┌──────────────────────────────┐  │    │
│  │  │   Services / API Layer       │  │    │
│  │  └──────────────────────────────┘  │    │
│  │  ┌──────────────────────────────┐  │    │
│  │  │   State Management           │  │    │
│  │  └──────────────────────────────┘  │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                    ▲ HTTP/JSON
                    │
┌─────────────────────────────────────────────┐
│           Server (Node.js/Express)           │
│  ┌────────────────────────────────────┐    │
│  │      REST API Endpoints             │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │      Controllers                    │    │
│  └────────────────────────────────────┘    │
│  ┌────────────────────────────────────┐    │
│  │      Models (Mongoose)              │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                    ▲
                    │
            ┌───────────────┐
            │   MongoDB     │
            └───────────────┘
```

---

## Directory Structure

### Current Client Structure (Repository Snapshot)

```
client/
├── index.tsx                        # Entry point
├── tsconfig.json                    # Client TypeScript config
├── src/
│   ├── components/                  # Reusable components
│   │   ├── common/                  # Shared UI components
│   │   ├── Layout/                  # Layout components
│   │   ├── Form/                    # Form components
│   │   ├── EntryRow/                # Entry row components
│   │   └── LoadingSpinner.tsx
│   ├── pages/                       # Page/Route components
│   │   └── *.tsx
│   ├── services/
│   │   └── api.ts                   # Fetch-based API client
│   ├── context/                     # React Context providers
│   │   └── AuthContext.tsx
│   ├── hooks/                       # Custom React hooks
│   │   ├── useFetch.ts
│   │   ├── useForm.ts
│   │   └── ...
│   ├── types/                       # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/                      # Global styles
│   │   └── index.css
│   ├── App.tsx                      # Root component
│   └── ...
└── README.md
```

Root-level files involved in client runtime:

```
webpack.config.js                    # Bundles client/index.tsx -> public/dist/bundle.js
public/react-app.html                # HTML shell served for /app
package.json                         # Shared dependencies + scripts
```

---

## Naming Conventions

### Files and Folders

```typescript
// Components: PascalCase
components/Button/Button.tsx
components/TopicRow/TopicRow.tsx

// Pages: PascalCase with "Page" suffix
pages/Auth/LoginPage.tsx
pages/Wiki/Topics/TopicsIndex.tsx

// Utilities: camelCase
utils/formatDate.ts
utils/validateEmail.ts

// Services: camelCase
services/api/topics.ts
services/storage/localStorage.ts

// Types: PascalCase
types/Topic.ts
types/User.ts

// Constants: SCREAMING_SNAKE_CASE
utils/constants.ts → export const API_BASE_URL = '...'

// CSS Modules: ComponentName.module.css
Button.module.css
TopicRow.module.css
```

### Component Naming

```typescript
// Component files
export const Button: React.FC<ButtonProps> = ({ ... }) => { ... }
export const TopicRow: React.FC<TopicRowProps> = ({ ... }) => { ... }

// Page components
export const LoginPage: React.FC = () => { ... }
export const TopicsIndex: React.FC = () => { ... }

// Context
export const AuthContext = createContext<AuthContextType>({ ... })

// Hooks
export const useAuth = () => { ... }
export const useApi = () => { ... }
```

---

## Component Patterns

### 1. Functional Components (Preferred)

```typescript
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
```

### 2. Component with Children

```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`card ${className || ''}`}>
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};
```

### 3. Component with Conditional Rendering

```typescript
interface TopicRowProps {
  topic: Topic;
  showDescription?: boolean;
}

export const TopicRow: React.FC<TopicRowProps> = ({ 
  topic, 
  showDescription = true 
}) => {
  return (
    <li className="topic-row">
      <h4>{topic.title}</h4>
      {showDescription && topic.description && (
        <p>{topic.description}</p>
      )}
      {topic.isVerified && <span className="badge">Verified</span>}
    </li>
  );
};
```

### 4. Component with List Rendering

```typescript
interface TopicListProps {
  topics: Topic[];
  onTopicClick?: (topic: Topic) => void;
}

export const TopicList: React.FC<TopicListProps> = ({ 
  topics, 
  onTopicClick 
}) => {
  if (topics.length === 0) {
    return <p>No topics found.</p>;
  }

  return (
    <ul className="topic-list">
      {topics.map((topic) => (
        <TopicRow 
          key={topic._id} 
          topic={topic}
          onClick={() => onTopicClick?.(topic)}
        />
      ))}
    </ul>
  );
};
```

### 5. Component with Custom Hook

```typescript
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

export const TopicsPage: React.FC = () => {
  const { data: topics, loading, error } = useApi<Topic[]>('/api/topics');

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  return (
    <div>
      <h1>Topics</h1>
      <TopicList topics={topics || []} />
    </div>
  );
};
```

---

## State Management

### 1. Local State (useState)

Use for component-specific state:

```typescript
const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      {/* ... */}
    </form>
  );
};
```

### 2. Context API (Global State)

Use for app-wide state:

```typescript
// context/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setUser(response.user);
  };

  const logout = () => {
    setUser(null);
    // Clear session
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// hooks/useAuth.ts
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 3. Custom Hooks for Reusable Logic

```typescript
// hooks/useApi.ts
export const useApi = <T,>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<T>(url);
        setData(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};
```

---

## Routing

### React Router v6 Setup

```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export const App: React.FC = () => {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected routes */}
          <Route path="/wiki" element={<ProtectedRoute />}>
            <Route path="topics" element={<TopicsIndex />} />
            <Route path="topics/:id" element={<TopicEntry />} />
            <Route path="topics/create" element={<TopicCreate />} />
          </Route>
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersList />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFound404 />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
```

### Protected Routes

```typescript
// components/ProtectedRoute.tsx
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};
```

---

## API Integration

### API Client Setup

```typescript
// services/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### API Service Example

```typescript
// services/api/topics.ts
import apiClient from './client';
import { Topic, CreateTopicDto } from '../../types/models';

export const topicsApi = {
  getAll: async (): Promise<Topic[]> => {
    const response = await apiClient.get<Topic[]>('/topics');
    return response.data;
  },

  getById: async (id: string): Promise<Topic> => {
    const response = await apiClient.get<Topic>(`/topics/${id}`);
    return response.data;
  },

  create: async (data: CreateTopicDto): Promise<Topic> => {
    const response = await apiClient.post<Topic>('/topics', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Topic>): Promise<Topic> => {
    const response = await apiClient.put<Topic>(`/topics/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/topics/${id}`);
  },
};
```

---

## Styling

### CSS Modules (Recommended)

```typescript
// Button.module.css
.button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary {
  background-color: #007bff;
  color: white;
}

.secondary {
  background-color: #6c757d;
  color: white;
}

// Button.tsx
import styles from './Button.module.css';

export const Button: React.FC<ButtonProps> = ({ variant, label }) => {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {label}
    </button>
  );
};
```

---

## Testing

### Component Test Example

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button label="Click me" onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## TypeScript Guidelines

### Type Definitions

```typescript
// types/models.ts
export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Topic {
  _id: string;
  title: string;
  description?: string;
  authorId: string;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

export type CreateTopicDto = Omit<Topic, '_id' | 'createdAt' | 'updatedAt'>;
```

### Props Interfaces

```typescript
// Always define props interface
interface ComponentProps {
  required: string;
  optional?: number;
  callback: (id: string) => void;
  children?: React.ReactNode;
}
```

---

*Reference Version: 1.0*  
*Last Updated: 2026-02-21*

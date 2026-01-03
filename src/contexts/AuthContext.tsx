import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'Collaborator' | 'CustomerService' | 'Accountant' | 'Client' | 'Guest';

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  email: string;
  clientId?: string; // For Client role - ID của khách hàng trong hệ thống
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  login: (username: string, password: string) => boolean;
  loginAsGuest: () => void;
  logout: () => void;
  hasAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users data for testing all roles
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'ctv001',
    password: '123456',
    fullName: 'Nguyễn Văn A',
    role: 'Collaborator',
    email: 'ctv001@lims.vn'
  },
  {
    id: '2',
    username: 'kd001',
    password: '123456',
    fullName: 'Trần Thị B',
    role: 'CustomerService',
    email: 'kd001@lims.vn'
  },
  {
    id: '3',
    username: 'kt001',
    password: '123456',
    fullName: 'Lê Văn C',
    role: 'Accountant',
    email: 'kt001@lims.vn'
  },
  {
    id: '4',
    username: 'client001',
    password: '123456',
    fullName: 'Phạm Thị D',
    role: 'Client',
    email: 'client001@example.com',
    clientId: '1001'
  },
  {
    id: '5',
    username: 'ctv002',
    password: '123456',
    fullName: 'Hoàng Văn E',
    role: 'Collaborator',
    email: 'ctv002@lims.vn'
  },
  {
    id: '6',
    username: 'kd002',
    password: '123456',
    fullName: 'Vũ Thị F',
    role: 'CustomerService',
    email: 'kd002@lims.vn'
  },
  {
    id: '7',
    username: 'client002',
    password: '123456',
    fullName: 'Đặng Văn G',
    role: 'Client',
    email: 'client002@example.com',
    clientId: '1002'
  }
];

// Role-based access control matrix
const accessMatrix: Record<UserRole, string[]> = {
  Collaborator: ['dashboard', 'clients', 'quotes', 'quotes-create', 'orders', 'orders-create', 'parameters'],
  CustomerService: ['dashboard', 'clients', 'quotes', 'quotes-create', 'orders', 'orders-create', 'parameters', 'accounting'],
  Accountant: ['dashboard', 'clients', 'parameters', 'orders', 'accounting'],
  Client: ['parameters', 'quotes', 'quotes-create', 'orders', 'orders-create'],
  Guest: ['parameters', 'quotes']
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const login = (username: string, password: string): boolean => {
    const foundUser = mockUsers.find(
      u => u.username === username && u.password === password
    );
    
    if (foundUser) {
      setUser(foundUser);
      setIsGuest(false);
      return true;
    }
    return false;
  };

  const loginAsGuest = () => {
    setUser(null);
    setIsGuest(true);
  };

  const logout = () => {
    setUser(null);
    setIsGuest(false);
  };

  const hasAccess = (page: string): boolean => {
    if (isGuest) {
      return accessMatrix.Guest.includes(page);
    }
    if (!user) {
      return false;
    }
    return accessMatrix[user.role].includes(page);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, login, loginAsGuest, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
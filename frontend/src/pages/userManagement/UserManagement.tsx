import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Crown,
  Trash2,
  Loader2,
  User,
  Mail,
  X,
  Lock,
  RotateCw,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/common';
import { usersApi } from '@/services/api'; 
import { formatDate } from '@/lib/utils'; 
import type { User as AppUser, PaginatedResponse } from '@/types'; 


const RoleBadge = ({ role }: { role: AppUser['role'] }) => {
  const roleStyles: Record<AppUser['role'], string> = {
    admin: 'bg-yellow-100 text-yellow-800',
    manager: 'bg-blue-100 text-blue-800',
    annotator: 'bg-purple-100 text-purple-800',
    viewer: 'bg-gray-100 text-gray-800',
  };
  const icon = role === 'admin' ? Crown : User;

  return (
    <Badge className={`capitalize font-medium ${roleStyles[role] || 'bg-gray-100 text-gray-800'}`}>
      <span className="mr-1 inline-flex items-center">
        {React.createElement(icon, { className: 'h-3 w-3' })}
      </span>
      {role}
    </Badge>
  );
};


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}


const CustomModal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl w-full max-w-md m-4 transform transition-all p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-start pb-4 border-b">
          <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100">
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};


interface RoleChangeModalProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
  queryClient: ReturnType<typeof useQueryClient>;
}

const ChangeRoleModal: React.FC<RoleChangeModalProps> = ({ user, isOpen, onClose, queryClient }) => {
  const [newRole, setNewRole] = useState<AppUser['role']>(user.role);
  const roles: AppUser['role'][] = ['admin', 'manager', 'annotator', 'viewer'];

  const changeRoleMutation = useMutation({
    mutationFn: (role: AppUser['role']) => usersApi.updateRole(user.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => {
      console.error('Failed to change role:', error);
      alert('Failed to change role. Check console for details.'); 
    },
  });

  const handleSave = () => {
    if (newRole !== user.role) {
      changeRoleMutation.mutate(newRole);
    } else {
      onClose();
    }
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Change Role for ${user.username}`}
    >
      <div className="py-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a new role for the user. Current role: <RoleBadge role={user.role} />
        </p>
        <label className="block text-sm font-medium text-gray-700">
          New Role
        </label>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as AppUser['role'])}
          className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:ring-primary focus:border-primary"
          disabled={changeRoleMutation.isPending}
        >
          {roles.map((role) => (
            <option key={role} value={role} className="capitalize">
              {role}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={newRole === user.role || changeRoleMutation.isPending}
        >
          {changeRoleMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Save changes'
          )}
        </Button>
      </div>
    </CustomModal>
  );
};


const AddUserModal: React.FC<{ isOpen: boolean; onClose: () => void; queryClient: ReturnType<typeof useQueryClient> }> = ({ isOpen, onClose, queryClient }) => {

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState(''); 
  const [lastName, setLastName] = useState('');   
  const [role, setRole] = useState<AppUser['role']>('viewer'); 
  const [error, setError] = useState('');
  
  const roles: AppUser['role'][] = ['admin', 'manager', 'annotator', 'viewer']; 

  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFirstName(''); 
      setLastName('');  
      setRole('viewer'); 
      setError('');
      onClose();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.username?.[0] || 
                       err.response?.data?.email?.[0] || 
                       err.response?.data?.password?.[0] || 
                       err.response?.data?.first_name?.[0] ||
                       err.response?.data?.last_name?.[0] ||
                       'Failed to create user.';
      setError(errorMsg);
      console.error('User creation failed:', err);
    },
  });

  const handleCreate = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!username || !password || !email || !firstName || !lastName) { 
      setError('Please fill out all required fields.');
      return;
    }
    createUserMutation.mutate({
      username,
      email,
      password,
      password_confirm: confirmPassword,
      first_name: firstName, 
      last_name: lastName,   
      role: role,           
    });
  };

  return (
    <CustomModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Add New User"
    >
      <div className="py-4 space-y-4">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm flex items-center">
            <X className="h-4 w-4 mr-2" /> {error}
          </div>
        )}

        {/* First Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <User className="h-4 w-4 mr-1 text-muted-foreground" /> First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            placeholder="Subhang"
            disabled={createUserMutation.isPending}
          />
        </div>
        
        {/* Last Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <User className="h-4 w-4 mr-1 text-muted-foreground" /> Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            placeholder="Tripathi"
            disabled={createUserMutation.isPending}
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <User className="h-4 w-4 mr-1 text-muted-foreground" /> Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            placeholder="unique_username"
            disabled={createUserMutation.isPending}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <Mail className="h-4 w-4 mr-1 text-muted-foreground" /> Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            placeholder="user@example.com"
            disabled={createUserMutation.isPending}
          />
        </div>
        
        {/* Role Dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <Crown className="h-4 w-4 mr-1 text-muted-foreground" /> Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AppUser['role'])}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:ring-primary focus:border-primary"
            disabled={createUserMutation.isPending}
          >
            {/* Displaying roles in lowercase as requested */}
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.toLowerCase()}
              </option>
            ))}
          </select>
        </div>


        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <Lock className="h-4 w-4 mr-1 text-muted-foreground" /> Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            placeholder="********"
            disabled={createUserMutation.isPending}
          />
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center">
            <Lock className="h-4 w-4 mr-1 text-muted-foreground" /> Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            placeholder="********"
            disabled={createUserMutation.isPending}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={createUserMutation.isPending}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={createUserMutation.isPending}>
          {createUserMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Create User'
          )}
        </Button>
      </div>
    </CustomModal>
  );
};

const DeleteConfirmationModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  username: string;
  isPending: boolean;
}> = ({ isOpen, onClose, onConfirm, username, isPending }) => (
  <CustomModal isOpen={isOpen} onClose={onClose} title="Delete User">
    <div className="py-4">
      <p className="text-sm text-gray-600">
        Are you sure you want to delete <span className="font-semibold text-gray-900">{username}</span>?
      </p>
    </div>
    <div className="flex justify-end gap-3 pt-4 border-t">
      <Button variant="outline" onClick={onClose} disabled={isPending}>
        No
      </Button>
      <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Yes, Delete
      </Button>
    </div>
  </CustomModal>
);

// --- Main Component ---

export function UserManagement() {
  const queryClient = useQueryClient();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<AppUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Fetch list of users
  const { data: usersData, isLoading, refetch } = useQuery<PaginatedResponse<AppUser>, Error>({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserToDelete(null);
    },
    onError: (error) => {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Check console for details.');
    },
  });

  const handleDelete = (user: AppUser) => {
    setUserToDelete(user);
  };

  const users: AppUser[] = usersData?.results || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddUserModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <UserPlus className="mx-auto h-12 w-12 mb-4" />
              <p>Click "Add New User" to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground border border-primary/20">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.username}</span>
                        <RoleBadge role={user.role} />
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined: {formatDate(user.date_joined)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRoleChangeUser(user)}
                      disabled={deleteUserMutation.isPending} 
                      className="flex items-center"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Change Role
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(user)}
                      disabled={deleteUserMutation.isPending}
                      className="flex items-center"
                    >
                      {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        queryClient={queryClient}
      />
      {roleChangeUser && (
        <ChangeRoleModal
          user={roleChangeUser}
          isOpen={!!roleChangeUser}
          onClose={() => setRoleChangeUser(null)}
          queryClient={queryClient}
        />
      )}
      {userToDelete && (
        <DeleteConfirmationModal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={() => deleteUserMutation.mutate(userToDelete.id)}
          username={userToDelete.username}
          isPending={deleteUserMutation.isPending}
        />
      )}
    </div>
  );
}
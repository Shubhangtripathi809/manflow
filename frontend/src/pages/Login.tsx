import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/common';
import { getCredentials } from '@/services/authStorage';



export function Login() {
  const { login } = useAuth();
  const savedCredentials = getCredentials();
  const [username, setUsername] = useState(savedCredentials?.username || '');
  const [password, setPassword] = useState(savedCredentials?.password || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [isVerified, setIsVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
    } catch {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to ZanFlow</CardTitle>
          <p className="text-muted-foreground">
            Sign in to your account to continue
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center relative">
              <button
                onClick={() => { setShowForgotPassword(false); setStep(1); }}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >✕</button>
              <CardTitle className="text-2xl">
                {step === 1 ? 'Forgot Password' : 'Create New Password'}
              </CardTitle>
              <p className="text-muted-foreground">
                {step === 1 ? 'Verify your identity' : 'Set your new secure password'}
              </p>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                /* Form 1: OTP Flow */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Email</label>
                    <div className="flex gap-2">
                      <Input placeholder="user@example.com" type="email" />
                      <Button variant="outline" type="button">Send OTP</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter OTP</label>
                    <div className="flex gap-2 items-center">
                      <Input placeholder="4-digit code" maxLength={4} className="text-center tracking-widest" />
                      {isVerified ? (
                        <div className="px-3 text-green-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      ) : (
                        <Button variant="outline" type="button" onClick={() => setIsVerified(true)}>Verify</Button>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    disabled={!isVerified}
                    onClick={() => setStep(2)}
                  >
                    Continue
                  </Button>
                </div>
              ) : (
                /* Form 2: New Password */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input type="password" placeholder="New password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <Input type="password" placeholder="Confirm new password" />
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setStep(1);
                      setIsVerified(false);
                    }}
                  >
                    Continue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>

  );
}

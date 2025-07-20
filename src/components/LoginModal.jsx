import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import API_CONFIG, { buildUrl } from '../config/api';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting login with PIN...');
      
      const response = await axios.post(buildUrl('/auth/login'), {
        pin: pin.trim()
      });

      console.log('✅ Login successful:', response.data);

      // Store session information
      const userData = response.data.user;
      
      // Store in localStorage for persistence
      localStorage.setItem('session_token', userData.session_token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('login_time', Date.now().toString());

      // Set default axios authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.session_token}`;

      // Call success callback
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }

      // Reset form and close modal
      setPin('');
      onClose();

    } catch (err) {
      console.error('❌ Login failed:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Network error - cannot reach server';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (e) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, '');
    setPin(value);
    setError(''); // Clear error when user types
  };

  const handleClose = () => {
    if (!isLoading) {
      setPin('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">🔐 Manager Login</DialogTitle>
          <DialogDescription className="text-center">
            Enter your PIN to access the timesheet management system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter your 4-digit PIN"
              maxLength={4}
              disabled={isLoading}
              className="text-center text-lg tracking-wider"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm font-medium">
                {error}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || pin.length < 4}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </form>

        <div className="text-xs text-gray-500 text-center mt-4">
          Only managers and administrators can access this system
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal; 
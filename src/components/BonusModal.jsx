import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import API_CONFIG, { buildUrl } from '../config/api';
import axios from 'axios';

const BonusModal = ({ isOpen, onClose, selectedUser, weekStartDate, onBonusAdded }) => {
  const [bonusData, setBonusData] = useState({
    day: '',
    amount: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Greek day names for the dropdown
  const dayOptions = [
    { value: 'monday', label: 'Δευτέρα', offset: 0 },
    { value: 'tuesday', label: 'Τρίτη', offset: 1 },
    { value: 'wednesday', label: 'Τετάρτη', offset: 2 },
    { value: 'thursday', label: 'Πέμπτη', offset: 3 },
    { value: 'friday', label: 'Παρασκευή', offset: 4 },
    { value: 'saturday', label: 'Σάββατο', offset: 5 },
    { value: 'sunday', label: 'Κυριακή', offset: 6 }
  ];

  // Calculate bonus date based on selected day
  const getBonusDate = (dayValue) => {
    if (!weekStartDate || !dayValue) return '';
    
    const selectedDay = dayOptions.find(d => d.value === dayValue);
    if (!selectedDay) return '';
    
    const bonusDate = new Date(weekStartDate);
    bonusDate.setDate(bonusDate.getDate() + selectedDay.offset);
    return bonusDate.toISOString().split('T')[0];
  };

  const handleInputChange = (field, value) => {
    setBonusData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Clear error when user types
  };

  const validateForm = () => {
    if (!bonusData.day) {
      setError('Please select a day of the week');
      return false;
    }
    
    if (!bonusData.amount || bonusData.amount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (bonusData.amount > 200) {
      setError('Maximum bonus amount is €200');
      return false;
    }
    
    if (!bonusData.description || bonusData.description.length < 10) {
      setError('Description must be at least 10 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const bonusDate = getBonusDate(bonusData.day);
      
      const response = await axios.post(buildUrl('/bonuses'), {
        user_id: selectedUser.id,
        week_start_date: weekStartDate,
        bonus_date: bonusDate,
        amount: parseFloat(bonusData.amount),
        description: bonusData.description.trim()
      }, {
        headers: {
          'X-User-Id': 'admin', // You'll need to get this from your auth system
          'X-User-Role': 'admin'
        }
      });
      
      console.log('✅ Bonus created:', response.data);
      
      // Reset form
      setBonusData({
        day: '',
        amount: '',
        description: ''
      });
      
      // Notify parent component
      if (onBonusAdded) {
        onBonusAdded(response.data.bonus);
      }
      
      // Close modal
      onClose();
      
    } catch (err) {
      console.error('❌ Error creating bonus:', err);
      console.error('❌ Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        config: err.config
      });
      
      let errorMessage = 'Failed to create bonus';
      
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response (network/CORS issue)
        errorMessage = 'Network error - cannot reach server';
      } else {
        // Something else
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setBonusData({
        day: '',
        amount: '',
        description: ''
      });
      setError('');
      onClose();
    }
  };

  if (!selectedUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            🎁 Add Bonus for {selectedUser.full_name}
          </DialogTitle>
          <DialogDescription>
            Week starting: {new Date(weekStartDate).toLocaleDateString('el-GR')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day Selection */}
          <div>
            <Label htmlFor="day" className="text-sm font-medium">
              Day of Week *
            </Label>
            <select
              id="day"
              value={bonusData.day}
              onChange={(e) => handleInputChange('day', e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select a day...</option>
              {dayOptions.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount (€) * <span className="text-gray-500">(Max €200)</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max="200"
              step="0.01"
              placeholder="0.00"
              value={bonusData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>

          {/* Description Input */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description * <span className="text-gray-500">(Min 10 characters)</span>
            </Label>
            <textarea
              id="description"
              placeholder="Why is this bonus being given? (e.g., Excellent performance, Overtime compensation, Special project completion)"
              value={bonusData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {bonusData.description.length}/10 characters minimum
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">❌ {error}</p>
            </div>
          )}

          {/* Bonus Preview */}
          {bonusData.day && bonusData.amount && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Preview:</strong> €{bonusData.amount} bonus on{' '}
                {dayOptions.find(d => d.value === bonusData.day)?.label} ({getBonusDate(bonusData.day)})
              </p>
            </div>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !bonusData.day || !bonusData.amount || !bonusData.description}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isSubmitting ? 'Adding...' : '🎁 Add Bonus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BonusModal; 
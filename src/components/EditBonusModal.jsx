import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import API_CONFIG, { buildUrl } from '../config/api';
// removed axios - using fetch for consistency with other endpoints

const EditBonusModal = ({ isOpen, onClose, bonus, weekStartDate, onBonusUpdated, weekStartDay = 4 }) => {
  const [bonusData, setBonusData] = useState({
    day: '',
    amount: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Greek day names for the dropdown - dynamically calculated based on week start day
  const getDayOptions = () => {
    const baseDays = [
      { value: 'sunday', label: 'Κυριακή', dayOfWeek: 0 },
      { value: 'monday', label: 'Δευτέρα', dayOfWeek: 1 },
      { value: 'tuesday', label: 'Τρίτη', dayOfWeek: 2 },
      { value: 'wednesday', label: 'Τετάρτη', dayOfWeek: 3 },
      { value: 'thursday', label: 'Πέμπτη', dayOfWeek: 4 },
      { value: 'friday', label: 'Παρασκευή', dayOfWeek: 5 },
      { value: 'saturday', label: 'Σάββατο', dayOfWeek: 6 }
    ];

    // Calculate offset based on actual week start day
    return baseDays.map(day => ({
      ...day,
      offset: (day.dayOfWeek - weekStartDay + 7) % 7
    })).sort((a, b) => a.offset - b.offset);
  };

  const dayOptions = getDayOptions();

  // Load bonus data when modal opens
  useEffect(() => {
    if (isOpen && bonus) {
      // Calculate which day of the week this bonus is for
      const bonusDate = new Date(bonus.bonus_date);
      const dayOfWeekBonus = bonusDate.getDay(); // 0=Sunday, 1=Monday, etc.
      
      // Find the day option that matches this day of week
      const selectedDay = dayOptions.find(d => d.dayOfWeek === dayOfWeekBonus);
      
      setBonusData({
        day: selectedDay?.value || '',
        amount: bonus.amount.toString(),
        description: bonus.description
      });
      setError('');
    }
  }, [isOpen, bonus, weekStartDate, dayOptions]);

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
      
      const response = await fetch(buildUrl(`/bonuses/${bonus.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "admin",
          "x-user-role": "admin"
        },
        body: JSON.stringify({
          amount: parseFloat(bonusData.amount),
          description: bonusData.description.trim(),
          bonus_date: bonusDate
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Bonus updated:', data);
      
      // Notify parent component
      if (onBonusUpdated) {
        onBonusUpdated(data.bonus || data);
      }
      
      // Close modal
      onClose();
      
    } catch (err) {
      console.error('❌ Error updating bonus:', err);
      console.error('❌ Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        config: err.config
      });
      
      let errorMessage = 'Failed to update bonus';
      
      if (err.message?.includes('HTTP')) {
        // Server responded with error
        errorMessage = `Server error: ${err.message}`;
      } else {
        // Network or other error
        errorMessage = err.message || 'Network error - cannot reach server';
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

  if (!bonus) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Bonus</DialogTitle>
          <DialogDescription>
            Modify bonus for {bonus.user_name} • Currently: €{bonus.amount}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="day">Day of Week</Label>
            <select
              id="day"
              value={bonusData.day}
              onChange={(e) => handleInputChange('day', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              <option value="">Select day...</option>
              {dayOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (€)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max="200"
              step="0.01"
              value={bonusData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="Enter amount (max €200)"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={bonusData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Reason for this bonus (minimum 10 characters)"
              disabled={isSubmitting}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px] resize-vertical"
              minLength={10}
              maxLength={500}
            />
            <div className="text-sm text-gray-500">
              {bonusData.description.length}/500 characters (minimum 10)
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm font-medium">
                {error}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Update Bonus'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBonusModal; 
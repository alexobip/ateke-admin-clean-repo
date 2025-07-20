import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BonusTable = ({ bonuses, onApproveBonus, onEditBonus, currentUserRole }) => {
  if (!bonuses || bonuses.length === 0) {
    return null; // Don't show table if no bonuses
  }

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200"
    };
    
    const icons = {
      pending: "⏳",
      approved: "✅", 
      rejected: "❌"
    };
    
    return (
      <Badge variant="outline" className={`${styles[status]} text-xs font-medium`}>
        {icons[status]} {status.toUpperCase()}
      </Badge>
    );
  };

  // Format date to Greek format
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Calculate total approved bonuses
  const totalApproved = bonuses
    .filter(bonus => bonus.status === 'approved')
    .reduce((sum, bonus) => sum + parseFloat(bonus.amount || 0), 0);

  const totalPending = bonuses
    .filter(bonus => bonus.status === 'pending')
    .reduce((sum, bonus) => sum + parseFloat(bonus.amount || 0), 0);

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          🎁 Weekly Bonuses
          <span className="text-sm font-normal text-gray-600">
            ({bonuses.length} total)
          </span>
        </h4>
        
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 font-medium">
            Approved: €{totalApproved.toFixed(2)}
          </span>
          {totalPending > 0 && (
            <span className="text-yellow-600 font-medium">
              Pending: €{totalPending.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-yellow-100">
              <TableHead className="w-[100px] font-semibold">Day</TableHead>
              <TableHead className="w-[80px] font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="w-[100px] font-semibold">Status</TableHead>
              <TableHead className="w-[120px] font-semibold">Added By</TableHead>
              {currentUserRole === 'admin' && (
                <TableHead className="w-[100px] font-semibold">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bonuses.map(bonus => (
              <TableRow 
                key={bonus.id} 
                className="hover:bg-yellow-25 border-yellow-200"
              >
                <TableCell className="font-medium">
                  {formatDate(bonus.bonus_date)}
                </TableCell>
                
                <TableCell className="font-semibold text-green-700">
                  €{parseFloat(bonus.amount).toFixed(2)}
                </TableCell>
                
                <TableCell className="max-w-[200px]">
                  <div className="truncate" title={bonus.description}>
                    {bonus.description}
                  </div>
                </TableCell>
                
                <TableCell>
                  <StatusBadge status={bonus.status} />
                </TableCell>
                
                <TableCell className="text-xs text-gray-600">
                  {bonus.added_by_name}
                  <div className="text-gray-400">
                    {new Date(bonus.created_at).toLocaleDateString('el-GR')}
                  </div>
                </TableCell>
                
                {currentUserRole === 'admin' && (
                  <TableCell>
                    <div className="flex gap-1">
                      {bonus.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApproveBonus(bonus.id, 'approved')}
                            className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                            title="Approve bonus"
                          >
                            ✅
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApproveBonus(bonus.id, 'rejected')}
                            className="h-7 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                            title="Reject bonus"
                          >
                            ❌
                          </Button>
                        </>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditBonus(bonus)}
                        className="h-7 px-2 text-xs"
                        title="Edit bonus"
                      >
                        ✏️
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Summary Row */}
        <div className="bg-yellow-100 border-t border-yellow-200 px-4 py-2">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-gray-700">
              Weekly Bonus Total:
            </span>
            <div className="flex gap-4">
              <span className="text-green-700">
                Approved: €{totalApproved.toFixed(2)}
              </span>
              {totalPending > 0 && (
                <span className="text-yellow-700">
                  Pending: €{totalPending.toFixed(2)}
                </span>
              )}
              <span className="text-gray-700 font-semibold">
                Total: €{(totalApproved + totalPending).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonusTable; 
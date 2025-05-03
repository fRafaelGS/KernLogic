import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, AuditLogEntry } from '@/services/teamService';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, UserPlus, UserCog, UserMinus } from 'lucide-react';

// Helper function to get action icon
const getActionIcon = (action: string) => {
  switch (action) {
    case 'invite':
      return <UserPlus className="h-4 w-4 mr-1" />;
    case 'role_change':
      return <UserCog className="h-4 w-4 mr-1" />;
    case 'remove':
      return <UserMinus className="h-4 w-4 mr-1" />;
    default:
      return null;
  }
};

// Helper function to get action color
const getActionColor = (action: string) => {
  switch (action) {
    case 'invite':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'role_change':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'remove':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Helper function to format action text
const formatActionText = (action: string) => {
  return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const TeamHistoryPage: React.FC = () => {
  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-enterprise-900">Team History</h1>
          <p className="text-enterprise-600 mt-1">
            Audit log of all team management activities
          </p>
        </div>
        <Link to="/app/team">
          <Button variant="outline" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="py-10 text-center">Loading audit logs...</div>
      )}

      {isError && (
        <div className="py-10 text-center text-red-500">
          Failed to load audit logs. Try again later.
        </div>
      )}

      {!isLoading && !isError && logs.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-lg text-gray-500">No team history records found.</p>
          <p className="text-sm text-gray-400 mt-2">
            Team management activities will be recorded here.
          </p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-4">
          {logs.map((log: AuditLogEntry) => (
            <div key={log.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center">
                    <Badge className={`flex items-center ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      {formatActionText(log.action)}
                    </Badge>
                    <span className="ml-2 text-sm text-gray-600 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(log.timestamp))} ago
                    </span>
                  </div>
                  
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">
                      {log.user ? log.user.name || log.user.email : 'System'}
                    </span> 
                    {' '}{renderActionDescription(log)}
                  </div>
                </div>
              </div>
              
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                  {renderDetails(log.details, log.action)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to render action description
const renderActionDescription = (log: AuditLogEntry) => {
  switch (log.action) {
    case 'invite':
      return `invited ${log.details.email || 'a user'} as ${log.details.role || 'member'}`;
    case 'role_change':
      return `changed role from ${log.details.from || 'previous role'} to ${log.details.to || 'new role'}`;
    case 'remove':
      return `removed ${log.details.email || 'a user'} (${log.details.role || 'member'})`;
    default:
      return `performed ${log.action} action`;
  }
};

// Helper function to render details
const renderDetails = (details: Record<string, any>, action: string) => {
  // For simple cases, we can just render as JSON
  return (
    <pre className="overflow-auto whitespace-pre-wrap">
      {JSON.stringify(details, null, 2)}
    </pre>
  );
};

export default TeamHistoryPage; 
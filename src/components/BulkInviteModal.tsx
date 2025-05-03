import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { bulkInviteMembers, TeamMember } from '@/services/teamService';
import { Role } from '@/types/team';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X, Info, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface BulkInviteModalProps {
  show: boolean;
  onHide: () => void;
  roles: Role[];
  onSuccess?: () => void;
}

interface InviteEntry {
  email: string;
  isValid: boolean;
  message?: string;
}

type BulkInviteFormData = {
  invites: { email: string; role_id: number }[];
};

const BulkInviteModal: React.FC<BulkInviteModalProps> = ({ 
  show, 
  onHide, 
  roles,
  onSuccess 
}) => {
  const { orgId } = useParams<{ orgId: string }>();
  const [emailsText, setEmailsText] = useState('');
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validatedEmails, setValidatedEmails] = useState<InviteEntry[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation<TeamMember[], Error, BulkInviteFormData>({
    mutationFn: (formData: BulkInviteFormData) => 
      bulkInviteMembers(formData.invites, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Invitations sent successfully');
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Bulk invitation error:', err);
      }
      
      // Extract error message from the response if available
      let errorMessage = 'Failed to send invitations';
      
      if (err.response) {
        // Handle structured API errors
        if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data && typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.status === 404) {
          errorMessage = 'API endpoint not found. Please check server configuration.';
        } else if (err.response.status === 401) {
          errorMessage = 'You are not authorized to perform this action.';
        } else if (err.response.status === 400) {
          errorMessage = 'Invalid input. Please check the emails and role.';
        }
        
        // Handle partial failures with detailed response
        if (err.response.data && err.response.data.results) {
          const failures = err.response.data.results.filter((r: any) => !r.success);
          if (failures.length > 0) {
            errorMessage = `${failures.length} invitations failed. Please check the emails and try again.`;
            // Show the failed emails in the validation results
            setValidatedEmails(prev => 
              prev.map(entry => {
                const failure = failures.find((f: any) => f.email === entry.email);
                if (failure) {
                  return { ...entry, isValid: false, message: failure.message || 'Failed to invite' };
                }
                return entry;
              })
            );
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  });

  // Validate emails whenever emailsText changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (emailsText.trim()) {
        validateEmails();
      } else {
        setValidatedEmails([]);
      }
    }, 500); // Debounce validation by 500ms
    
    return () => clearTimeout(timer);
  }, [emailsText]);

  const validateEmails = () => {
    setIsValidating(true);
    setError(null);
    
    try {
      // Split by commas or newlines
      const emails = emailsText
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
      
      if (emails.length === 0) {
        setValidatedEmails([]);
        setIsValidating(false);
        return false;
      }
      
      // Validate each email
      const validated = emails.map(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        
        return {
          email,
          isValid,
          message: isValid ? undefined : 'Invalid email format'
        };
      });
      
      setValidatedEmails(validated);
      setIsValidating(false);
      
      // Check if all emails are valid
      return validated.every(entry => entry.isValid);
    } catch (error) {
      setError('Error validating emails');
      setIsValidating(false);
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailsText.trim()) {
      setError('Please enter email addresses');
      return;
    }

    if (!roleId) {
      setError('Please select a role');
      return;
    }
    
    // Check if all emails are valid
    const allValid = validatedEmails.length > 0 && validatedEmails.every(entry => entry.isValid);
    
    if (allValid) {
      // Prepare data for API call
      const invites = validatedEmails
        .filter(entry => entry.isValid)
        .map(entry => ({
          email: entry.email,
          role_id: parseInt(roleId, 10)
        }));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending bulk invites to API:', {
          invites,
          orgId,
          endpoint: `/api/orgs/${orgId}/memberships/bulk/`
        });
      }
      
      inviteMutation.mutate({ invites });
    } else {
      setError('Please fix the invalid emails before submitting');
    }
  };

  const handleClose = () => {
    inviteMutation.reset(); // Reset mutation state on close
    setEmailsText('');
    setRoleId('');
    setError(null);
    setValidatedEmails([]);
    onHide();
  };

  const handleSampleFormat = () => {
    setEmailsText('johndoe@example.com\njanedoe@example.com\nuser@company.org');
  };

  // Calculate if submit should be enabled
  const canSubmit = roleId !== '' && 
                   validatedEmails.length > 0 && 
                   validatedEmails.every(entry => entry.isValid) &&
                   !inviteMutation.isPending &&
                   !isValidating;

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Invite Team Members</DialogTitle>
          <DialogDescription>
            Invite multiple team members at once, one email per line.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center">
                <X className="h-4 w-4 mr-2" />
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="emails">Email addresses</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSampleFormat}
                  className="text-xs"
                  disabled={inviteMutation.isPending}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Show sample format
                </Button>
              </div>
              <Textarea
                id="emails"
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder="Enter email addresses, one per line or comma-separated"
                rows={5}
                className="resize-none"
                disabled={inviteMutation.isPending}
              />
              <p className="text-sm text-muted-foreground flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Enter one email per line or separate with commas
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role for all invitees</Label>
              <Select 
                value={roleId} 
                onValueChange={setRoleId}
                disabled={inviteMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name} {role.description ? `- ${role.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Validation results */}
            {validatedEmails.length > 0 && (
              <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto">
                <h4 className="text-sm font-medium mb-2">Validation Results</h4>
                <ul className="space-y-1">
                  {validatedEmails.map((entry, index) => (
                    <li key={index} className="text-xs flex items-center">
                      <span className={entry.isValid ? "text-green-600" : "text-red-600"}>
                        {entry.isValid ? "✓" : "✗"}
                      </span>
                      <span className="ml-2">{entry.email}</span>
                      {entry.message && <span className="ml-2 text-red-500">({entry.message})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline"
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={!canSubmit}
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : 'Invite Members'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkInviteModal; 
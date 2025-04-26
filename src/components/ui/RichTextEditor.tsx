import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Heading1, 
  Heading2,
  Code,
  EyeIcon,
  EditIcon,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange,
  placeholder = 'Enter text here...'
}) => {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const handleFormat = (formatType: string) => {
    if (!selection) return;
    
    const { start, end } = selection;
    const selectedText = value.substring(start, end);
    let replacement = '';
    
    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText}**`;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        break;
      case 'h1':
        replacement = `# ${selectedText}`;
        break;
      case 'h2':
        replacement = `## ${selectedText}`;
        break;
      case 'ul':
        replacement = selectedText.split('\n').map(line => `- ${line}`).join('\n');
        break;
      case 'ol':
        replacement = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
        break;
      case 'link':
        replacement = `[${selectedText}](https://)`;
        break;
      case 'code':
        replacement = `\`\`\`\n${selectedText}\n\`\`\``;
        break;
      case 'hr':
        replacement = `${selectedText ? selectedText + '\n\n' : ''}---\n\n`;
        break;
      default:
        return;
    }
    
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
  };
  
  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    setSelection({
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    });
  };
  
  const togglePreview = () => {
    setIsPreview(!isPreview);
  };
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-slate-50 p-2 border-b flex flex-wrap gap-1 justify-between">
        <div className="flex flex-wrap gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('bold')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('italic')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('h1')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 1</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('h2')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Heading 2</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('ul')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet List</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('ol')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Numbered List</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('link')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Link</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('code')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code Block</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormat('hr')}
                  className="h-8 w-8 p-0"
                  disabled={isPreview}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Horizontal Rule</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={togglePreview}
                  className="h-8 px-2"
                >
                  {isPreview ? (
                    <>
                      <EditIcon className="h-4 w-4 mr-1" />
                      <span className="text-xs">Edit</span>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-4 w-4 mr-1" />
                      <span className="text-xs">Preview</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPreview ? 'Edit mode' : 'Preview mode'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {isPreview ? (
        <div className="w-full p-3 min-h-[200px] prose max-w-none">
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground">{placeholder}</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          placeholder={placeholder}
          className="w-full p-3 min-h-[200px] resize-y outline-none focus:ring-0"
        />
      )}
    </div>
  );
}; 
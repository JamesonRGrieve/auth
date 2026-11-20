// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { LuArrowLeft as ArrowLeft } from 'react-icons/lu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { cn } from './lib/utils';

export interface AuthCardProps extends React.PropsWithChildren {
  showBackButton?: boolean;
  title: string;
  description: string;
  responseMessage?: string;
}

export const ResponseMessage = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => {
  return (
    <div role='alert' className={cn('mt-4 text-sm text-center text-destructive', className)} {...props}>
      {children}
    </div>
  );
};

export default function AuthCard({
  children,
  showBackButton,
  title,
  description,
  responseMessage,
}: AuthCardProps): React.JSX.Element {
  return (
    <Card className='mx-auto w-full max-w-md border-0 bg-transparent shadow-none sm:min-w-96 sm:border sm:bg-card sm:shadow-sm'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='min-w-8'>
            {showBackButton === true && (
              <Button variant='ghost' size='icon' className='w-8 h-8' onClick={() => window.history.back()}>
                <ArrowLeft className='w-5 h-5' />
                <span className='sr-only'>Go back</span>
              </Button>
            )}
          </div>
          <CardTitle level={1} className='text-2xl'>
            {title}
          </CardTitle>
          <div className='w-8' /> {/* Spacer for alignment */}
        </div>
        <CardDescription className='text-center'>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-6'>{children}</div>
        {responseMessage !== undefined && responseMessage !== '' && <ResponseMessage>{responseMessage}</ResponseMessage>}
      </CardContent>
    </Card>
  );
}
AuthCard.ResponseMessage = ResponseMessage;

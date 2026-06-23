<?php

namespace App\Notifications;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EnquiryNoResponse extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Enquiry $enquiry,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $enquiry = $this->enquiry;

        return (new MailMessage)
            ->subject("Action required — {$enquiry->name} has not been contacted")
            ->greeting("Hi {$notifiable->name},")
            ->line("The following lead assigned to you has not been contacted. Please update the status or log a follow-up note.")
            ->line("**Client:** {$enquiry->name}")
            ->when($enquiry->phone,  fn ($mail) => $mail->line("**Phone:** {$enquiry->phone}"))
            ->when($enquiry->email,  fn ($mail) => $mail->line("**Email:** {$enquiry->email}"))
            ->when($enquiry->type,   fn ($mail) => $mail->line("**Type:** {$enquiry->type}"))
            ->when($enquiry->loc,    fn ($mail) => $mail->line("**Location:** {$enquiry->loc}"))
            ->when($enquiry->source, fn ($mail) => $mail->line("**Source:** {$enquiry->source}"))
            ->line("**Status:** {$enquiry->status}")
            ->action('View Enquiry', url('/enquiries'))
            ->line('Update the status to Contacted or log a follow-up note to clear this alert.')
            ->salutation('Regards, ' . config('app.name'));
    }
}

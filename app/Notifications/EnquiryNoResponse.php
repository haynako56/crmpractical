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
            ->subject("No response logged — {$enquiry->name}")
            ->greeting("Hi {$notifiable->name},")
            ->line("There has been no follow-up logged in the last 24 hours for the following enquiry assigned to you.")
            ->line("**Client:** {$enquiry->name}")
            ->when($enquiry->phone,  fn ($mail) => $mail->line("**Phone:** {$enquiry->phone}"))
            ->when($enquiry->email,  fn ($mail) => $mail->line("**Email:** {$enquiry->email}"))
            ->when($enquiry->type,   fn ($mail) => $mail->line("**Type:** {$enquiry->type}"))
            ->when($enquiry->loc,    fn ($mail) => $mail->line("**Location:** {$enquiry->loc}"))
            ->when($enquiry->source, fn ($mail) => $mail->line("**Source:** {$enquiry->source}"))
            ->line("**Status:** {$enquiry->status}")
            ->action('View Enquiry', url('/enquiries'))
            ->line('Please log a follow-up note as soon as possible.')
            ->salutation('Regards, ' . config('app.name'));
    }
}

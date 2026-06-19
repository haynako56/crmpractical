<?php

namespace App\Notifications;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EnquiryAssignmentReminder extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Enquiry $enquiry,
        public readonly string  $token,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $enquiry    = $this->enquiry;
        $confirmUrl = url("/enquiry-assignments/{$this->token}/confirm");

        return (new MailMessage)
            ->subject("Reminder: Please confirm your assigned enquiry — {$enquiry->name}")
            ->greeting("Hi {$notifiable->name},")
            ->line("This is a reminder that you have not yet confirmed the following enquiry assignment.")
            ->line("**Client:** {$enquiry->name}")
            ->when($enquiry->phone,  fn ($mail) => $mail->line("**Phone:** {$enquiry->phone}"))
            ->when($enquiry->email,  fn ($mail) => $mail->line("**Email:** {$enquiry->email}"))
            ->when($enquiry->type,   fn ($mail) => $mail->line("**Type:** {$enquiry->type}"))
            ->when($enquiry->loc,    fn ($mail) => $mail->line("**Location:** {$enquiry->loc}"))
            ->when($enquiry->source, fn ($mail) => $mail->line("**Source:** {$enquiry->source}"))
            ->line("**Status:** {$enquiry->status}")
            ->action('Confirm Assignment', $confirmUrl)
            ->salutation('Regards, ' . config('app.name'));
    }
}

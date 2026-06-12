<?php

namespace App\Notifications;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EnquiryAssigned extends Notification
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
            ->subject("New enquiry assigned: {$enquiry->name}")
            ->greeting("Hi {$notifiable->name},")
            ->line("A new enquiry has been assigned to you.")
            ->line("**Client:** {$enquiry->name}")
            ->when($enquiry->phone, fn ($mail) => $mail->line("**Phone:** {$enquiry->phone}"))
            ->when($enquiry->email, fn ($mail) => $mail->line("**Email:** {$enquiry->email}"))
            ->when($enquiry->type,  fn ($mail) => $mail->line("**Type:** {$enquiry->type}"))
            ->when($enquiry->loc,   fn ($mail) => $mail->line("**Location:** {$enquiry->loc}"))
            ->when($enquiry->source, fn ($mail) => $mail->line("**Source:** {$enquiry->source}"))
            ->line("**Status:** {$enquiry->status}")
            ->action('View Enquiry', url('/enquiries'))
            ->salutation('Regards, ' . config('app.name'));
    }
}

## Mail Module

The `mail` module is the first implementation of a notification channel. It is responsible for sending transactional emails to users.

### Functionality

- Sends welcome emails upon user registration.
- Sends email verification messages.
- Sends notifications for club invitations, application status changes, etc.

### Implementation Details

- **`mail.module.ts`**: Imports the `MailerModule` and configures it. It also provides the `MailService`.
- **`mail.service.ts`**: Contains the core logic for sending emails. It uses the `nestjs-mailer` package to send emails via SMTP.
- **`mail.listener.ts`**: Listens for events emitted from other modules (e.g., `AuthModule`, `ApplicationModule`). When an event is caught, it calls the appropriate method in `mail.service.ts` to send an email.
- **`templates/`**: This directory contains EJS templates for the emails.

### How it Works

Other modules in the application can emit events using NestJS's `EventEmitterModule`. The `mail.listener.ts` is subscribed to these events. When an event is emitted with the correct payload, the listener will trigger the `MailService` to send an email to the user.

For example, when a new user signs up, the `AuthService` might emit a `user.welcome` event. The `MailListener` would catch this event and call `mailService.sendWelcomeEmail(user)`.

### Usage Example

Here is an example of how the `AuthModule` can emit an event to send a verification email.

1.  **Import `EventEmitterModule` in your module:**

    ```typescript
    // src/modules/auth/auth.module.ts
    import { Module } from '@nestjs/common';
    import { EventEmitterModule } from '@nestjs/event-emitter';
    import { MailModule } from '../mail/mail.module';

    @Module({
      providers: [AuthService],
      imports: [MailModule, EventEmitterModule.forRoot()],
    })
    export class AuthModule {}
    ```

2.  **Inject `EventEmitter2` and emit the event in your service:**

    ```typescript
    // src/modules/auth/auth.service.ts
    import { Injectable } from '@nestjs/common';
    import { EventEmitter2 } from '@nestjs/event-emitter';

    @Injectable()
    export class AuthService {
      constructor(private readonly eventEmitter: EventEmitter2) {}

      async someMethod(user: User) {
        // ... some logic
        const url = '...'; // some verification url

        // Fire event to (send email for verification)
        this.eventEmitter.emit('auth.verificationEmail', eventMethodParameters);

        // ... more logic
      }
    }
    ```

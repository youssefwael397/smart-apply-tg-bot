import { Injectable } from '@nestjs/common';
import { User } from './user.entity';

@Injectable()
export class UserService {
  private users: Map<number, User> = new Map();

  createOrUpdateUser(telegramId: number, data: Partial<User>): User {
    let user = this.users.get(telegramId);
    
    if (!user) {
      user = new User(telegramId);
      this.users.set(telegramId, user);
    }

    Object.assign(user, data);
    return user;
  }

  getUser(telegramId: number): User | undefined {
    return this.users.get(telegramId);
  }

  updateUser(telegramId: number, data: Partial<User>): User | null {
    const user = this.users.get(telegramId);
    if (!user) return null;
    
    Object.assign(user, data);
    return user;
  }
}

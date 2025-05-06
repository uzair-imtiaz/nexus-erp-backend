import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(user: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepository.findOneBy({
      email: user.email,
    });
    if (existingUser) {
      const errorMessage = `User with email ${user.email} already exists.`;
      throw new ConflictException(errorMessage);
    }
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(user.password, salt);
    const _user = this.userRepository.create(user);
    await this.userRepository.insert(_user);
    const { password, ...result } = _user;
    return result;
  }

  async findOneById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    console.log('user', user);
    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async findOneByEmail(email: string, select?: (keyof User)[]) {
    const user = await this.userRepository.findOne({
      where: { email },
      select,
    });
    if (!user) {
      const errorMessage = `User with email ${email} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async updateUser(id: string, user: UpdateUserDto) {
    const updated = await this.userRepository.update(id, user);
    if (!updated) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }

    return updated;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }
}

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
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { TenantService } from 'src/tenant/tenant.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly tenantContextService: TenantContextService,
    private readonly tenantService: TenantService,
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
    const tenant = await this.tenantService.create({
      name: user.tenantName,
    });
    const _user = this.userRepository.create(user);
    _user.tenant = tenant;
    await this.userRepository.insert(_user);
    const { password, ...result } = _user;
    return result;
  }

  async findOneById(id: string) {
    const tenantId = this.tenantContextService.getTenantId();
    const user = await this.userRepository.findOne({
      where: { id, tenant: { id: tenantId } },
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
      relations: ['tenant'],
    });
    if (!user) {
      const errorMessage = `User with email ${email} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async updateUser(id: string, user: UpdateUserDto) {
    const tenantId = this.tenantContextService.getTenantId();
    const existingUser = await this.userRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });
    if (!existingUser) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }
    const updated = this.userRepository.merge(existingUser, user);
    return updated;
  }

  async findAll(): Promise<User[]> {
    const tenantId = this.tenantContextService.getTenantId();
    return await this.userRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }
}

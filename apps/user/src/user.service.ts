import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { ActivationDto, LoginDto, RegisterDto } from './dto/user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email/email.service';
import { JWTTokenSender } from './utils/sendToken';

export interface UserData {
  name: string;
  email: string;
  password: string;
  phone_number: string;
}

@Injectable()
export class UserService {
  private usersService;
  logger: Logger;
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.logger = new Logger();
  }

  // Register Service

  async register(registerDto: RegisterDto, response: Response) {
    this.logger.warn(`register service triggered!`);
    const { name, email, password, phone_number } = registerDto;
    const isEmailExist = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    const isPhoneNumberExist = await this.prismaService.user.findUnique({
      where: {
        phone_number,
      },
    });

    if (isPhoneNumberExist) {
      this.logger.warn(`User ${name} phone already exists`);
      throw new BadRequestException(`User ${name} phone already exists`);
    }

    if (isEmailExist) {
      this.logger.warn(`User ${name} email already exists`);
      throw new BadRequestException(`User ${name} email already exists`);
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = {
      name: name,
      email: email,
      password: hashPassword,
      phone_number: phone_number,
    };

    const activationToken = await this.createActivationToken(user);

    const activationCode = activationToken.activationCode;

    const activation_token = activationToken.token;

    //Use RabitMQ to sent email notification

    // message patter to sent emails
    // create separate function in notification service for every email notification
    this.logger.warn(`Activate your Foodzap account! email triggered!`);
    await this.emailService.sendMail({
      email,
      subject: 'Activate your Foodzap account!',
      template: './activation-mail',
      name,
      activationCode,
    });

    return { activation_token, response };
  }

  // create activation token
  async createActivationToken(user: UserData) {
    this.logger.warn(`createActivationToken service triggered!`);
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = this.jwtService.sign(
      {
        user,
        activationCode,
      },
      {
        secret: this.configService.get<string>('ACTIVATION_TOKEN'),
        expiresIn: '5m',
      },
    );
    return { token: token, activationCode: activationCode };
  }

  //activate user after validating the activation code

  async activateUser(activationDto: ActivationDto, response: Response) {
    this.logger.warn(`activateUser service triggered!`);
    const { activationToken, activationCode } = activationDto;

    const newUser: { user: UserData; activationCode: string } =
      this.jwtService.verify(activationToken, {
        secret: this.configService.get<string>('ACTIVATION_TOKEN'),
      } as JwtVerifyOptions) as {
        user: UserData;
        activationCode: string;
      };

    if (newUser.activationCode !== activationCode) {
      throw new BadGatewayException('Invalid activation code');
    }

    const { name, email, password, phone_number } = newUser.user;

    const isEmailExist = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    const isPhoneNumberExist = await this.prismaService.user.findUnique({
      where: {
        phone_number,
      },
    });

    if (isPhoneNumberExist) {
      this.logger.warn(
        `activateUser service - User ${name} phone already exists`,
      );
      throw new BadRequestException(`User ${name} phone already exists`);
    }

    if (isEmailExist) {
      this.logger.warn(
        `activateUser service - User ${name} email already exists`,
      );
      throw new BadRequestException(`User ${name} email already exists`);
    }

    const user = await this.prismaService.user.create({
      data: {
        name: name,
        email: email,
        password: password,
        phone_number: phone_number,
      },
    });
    return { user, response };
  }

  // Login Service
  async login(loginDto: LoginDto) {
    this.logger.warn(`login service triggered!`);
    const { email, password } = loginDto;
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });

    if (email && (await this.comparePassword(password, user.password))) {
      const tokenSender = new JWTTokenSender(
        this.jwtService,
        this.configService,
      );
      return tokenSender.sendToken(user);
    } else {
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        error: {
          message: 'invalid email or password',
        },
      };
    }
  }

  // compare with hashed password
  async comparePassword(
    password: string,
    UserPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, UserPassword);
  }

  // get logged in user
  async getLoggedInUser(req: any) {
    const user = req.headers.user;
    const refreshToken = req.headers.refreshtoken;
    const accessToken = req.headers.accesstoken;
    // console.log('req', { user, refreshToken, accessToken });
    return { user, refreshToken, accessToken };
  }

  //Logout user

  async logout(req: any) {
    this.logger.warn(`logout service triggered!`);
    req.headers.accesstoken = null;
    req.headers.refreshtoken = null;
    req.headers.user = null;

    return {
      message: 'Logged out successfully!',
    };
  }

  async getUsers() {
    this.logger.warn(`getUsers service triggered!`);
    const user = this.prismaService.user.findMany();
    return user;
  }
}

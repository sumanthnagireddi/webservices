import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LoginDataDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from './schemas/refresh-token-schema';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async login(loginData: LoginDataDto) {
    const { email, password } = loginData;
    const user = await this.userService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(String(user._id));
  }

  async generateToken(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { userId: String(user._id), email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    await this.storeRefreshToken(String(user._id), refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const token = await this.refreshTokenModel
      .findOne({
        refreshToken,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateToken(token.userId);
  }

  async storeRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenDoc = {
      userId,
      refreshToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    await this.refreshTokenModel.findOneAndUpdate({ userId }, refreshTokenDoc, {
      upsert: true,
      new: true,
    });
  }

  async logout(email: string) {
    const user = await this.userService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.refreshTokenModel
      .findOneAndDelete({ userId: String(user._id) })
      .exec();
  }
}

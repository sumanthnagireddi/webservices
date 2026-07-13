import { Module } from '@nestjs/common';
import { setServers } from 'node:dns';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlogModule } from './modules/blogs/blog.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { FinanceModule } from './modules/finance/finance.module';
import { InterviewBankModule } from './modules/interview-bank/interview-bank.module';
import { AtlassianModule } from './modules/atlassian/atlassian.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { ContentModule } from './modules/content/content.module';

const DEFAULT_MONGODB_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

function getMongoDnsServers(configService: ConfigService): string[] {
  const configuredServers = configService.get<string>('MONGODB_DNS_SERVERS');

  return configuredServers
    ? configuredServers
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean)
    : DEFAULT_MONGODB_DNS_SERVERS;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');

        if (!uri) {
          throw new Error('MONGODB_URI is not configured');
        }

        if (uri.startsWith('mongodb+srv://')) {
          setServers(getMongoDnsServers(configService));
        }

        return { uri };
      },
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      global: true,
      inject: [ConfigService],
    }),
    BlogModule,
    UserModule,
    AuthModule,
    FinanceModule,
    SearchModule,
    InterviewBankModule,
    AtlassianModule,
    NotificationsModule,
    ContentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

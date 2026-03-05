import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ResourcesModule } from './modules/resource/resources.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TechnologiesModule } from './modules/technolgoies/technologies.module';
import { TestModule } from './modules/technolgoies copy/test.module';
import { TopicsModule } from './modules/topics/topics.module';
import { ContentModule } from './modules/content/content.module';
import { BlogModule } from './modules/blogs/blog.module';
import { CronExpression, ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { FinanceModule } from './modules/finance/finance.module';
import { AiModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
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
    ResourcesModule,
    TechnologiesModule,
    TestModule,
    TopicsModule,
    ContentModule,
    BlogModule,
    AiModule,
    UserModule,
    AuthModule,
    FinanceModule,
    SearchModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDataDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with correct data', async () => {
      const loginDto: LoginDataDto = {
        email: 'test@example.com',
        password: 'Password123',
      };
      const expectedResult = {
        accessToken: 'token123',
        refreshToken: 'refresh123',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle login with valid credentials', async () => {
      const loginDto: LoginDataDto = {
        email: 'user@test.com',
        password: 'SecurePass123',
      };

      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      });

      const result = await controller.login(loginDto);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should propagate errors from service', async () => {
      const loginDto: LoginDataDto = {
        email: 'wrong@example.com',
        password: 'wrongpass',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshAccessToken with refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshAccessToken.mockResolvedValue(expectedResult);

      const result = await controller.refreshToken(refreshToken);

      expect(service.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(expectedResult);
    });

    it('should return new tokens', async () => {
      const refreshToken = 'uuid-refresh-token';
      mockAuthService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-jwt',
        refreshToken: 'new-uuid',
      });

      const result = await controller.refreshToken(refreshToken);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should handle invalid refresh token', async () => {
      const refreshToken = 'invalid-token';
      mockAuthService.refreshAccessToken.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(controller.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should call authService.logout with email', async () => {
      const loginDto: LoginDataDto = {
        email: 'user@example.com',
        password: 'Password123',
      };

      mockAuthService.logout.mockResolvedValue({ message: 'Logged out' });

      const result = await controller.logout(loginDto);

      expect(service.logout).toHaveBeenCalledWith(loginDto.email);
      expect(result).toBeDefined();
    });

    it('should successfully logout user', async () => {
      const loginDto: LoginDataDto = {
        email: 'test@test.com',
        password: 'TestPass123',
      };

      mockAuthService.logout.mockResolvedValue({ deletedCount: 1 });

      const result = await controller.logout(loginDto);
      expect(result).toBeDefined();
    });

    it('should handle logout for non-existent user', async () => {
      const loginDto: LoginDataDto = {
        email: 'nonexistent@test.com',
        password: 'Password123',
      };

      mockAuthService.logout.mockResolvedValue(null);

      const result = await controller.logout(loginDto);
      expect(result).toBeNull();
    });
  });
});

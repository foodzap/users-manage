import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { Response } from 'express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('signup')
  signUp(@Body() user,@Res({ passthrough: true }) response: Response) {
    return this.userService.register(user, response)
  }
  @Post('verify-otp')
  veriFyOtp(@Body() verifyinfo, @Res({ passthrough: true }) response: Response){
    return this.userService.activateUser(verifyinfo, response);
  }
  @Post('login')
  login(@Body() loginDto) {
    return this.userService.login(loginDto)
  }
  @Get('logout')
  logout(@Req() req: Request){
    return this.userService.logout(req);
  }
  @Get('getusers')
  getUsers(){
    return this.userService.getUsers();
  }
  @Get('current-user')
  getLoggedInUser(@Req() req: Request) {
    return this.userService.getLoggedInUser(req);
  }
  @Get()
  getHello(): string {
    return 'Hello world';
  }
}

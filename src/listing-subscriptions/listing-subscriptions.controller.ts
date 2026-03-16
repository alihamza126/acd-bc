import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ListingSubscriptionsService } from './listing-subscriptions.service';
import { CreateListingSubscriptionDto } from './dto/create-listing-subscription.dto';
import { UpdateListingSubscriptionDto } from './dto/update-listing-subscription.dto';

@Controller('listing-subscriptions')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ListingSubscriptionsController {
  constructor(
    private readonly subscriptionsService: ListingSubscriptionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateListingSubscriptionDto,
  ) {
    return this.subscriptionsService.create(req.user.id, dto);
  }

  @Get('me')
  async findMy(@Request() req: { user: { id: number } }) {
    return this.subscriptionsService.findMy(req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateListingSubscriptionDto,
  ) {
    return this.subscriptionsService.update(req.user.id, id, dto);
  }

  @Patch(':id/pause')
  async pause(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.subscriptionsService.pause(req.user.id, id);
  }

  @Patch(':id/resume')
  async resume(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.subscriptionsService.resume(req.user.id, id);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.subscriptionsService.cancel(req.user.id, id);
  }
}


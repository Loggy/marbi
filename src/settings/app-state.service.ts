import { Injectable } from '@nestjs/common';

@Injectable()
export class AppStateService {
  private isInitialized = false;

  setInitialized(value: boolean): void {
    this.isInitialized = value;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
} 
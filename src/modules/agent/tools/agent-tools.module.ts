import { Module } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { ToolGatewayService } from './tool-gateway.service';

// Tools module owns discovery, registration, and execution of agent tools.
@Module({
  providers: [ToolRegistryService, ToolGatewayService],
  exports: [ToolRegistryService, ToolGatewayService],
})
export class AgentToolsModule {}

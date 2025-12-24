import { PartialType } from "@nestjs/mapped-types";
import { CreateTopicsDTO } from "./create-topic.dto";

export class UpdateTopicDto extends PartialType(CreateTopicsDTO) {}

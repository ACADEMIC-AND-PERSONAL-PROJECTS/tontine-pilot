import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

// Phase 1: auth + data + storage. Phase 2 registers the six
// Lambda functions here (see TASKS.md + backend-plan/04).
defineBackend({ auth, data, storage });

/**
 * AI Command System Type Definitions
 *
 * Defines structured command types for AI-powered natural language interface.
 * These types ensure type safety between AI parsing and command execution.
 */

/**
 * Command categories supported by the AI system
 */
export type CommandCategory =
  | 'creation'      // Create new shapes
  | 'manipulation'  // Modify existing shapes
  | 'layout'        // Arrange multiple shapes
  | 'complex'       // Multi-step predefined templates
  | 'selection'     // Select shapes by criteria
  | 'deletion'      // Remove shapes
  | 'style'         // Update visual properties
  | 'utility';      // Canvas operations (zoom, undo, etc.)

/**
 * Shape types available for creation
 */
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'text';

/**
 * Layout arrangement types
 */
export type ArrangementType = 'horizontal' | 'vertical' | 'grid';

/**
 * Alignment options for layout commands
 */
export type AlignmentType = 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right';

/**
 * Distribution types for spacing shapes
 */
export type DistributionType = 'horizontal' | 'vertical';

/**
 * Selection criteria types
 */
export type SelectionCriteria = 'all' | 'type' | 'color' | 'region';

/**
 * Deletion target types
 */
export type DeletionTarget = 'selected' | 'all' | 'type' | 'region';

/**
 * Utility action types
 */
export type UtilityAction = 
  | 'zoom-in' 
  | 'zoom-out' 
  | 'center' 
  | 'undo' 
  | 'redo' 
  | 'clear-selection';

/**
 * Template names for complex commands
 */
export type TemplateName = 
  | 'loginForm' 
  | 'trafficLight' 
  | 'navigationBar' 
  | 'signupForm' 
  | 'dashboard';

/**
 * Command parameters - varies by category
 */
export interface CommandParameters {
  // Creation parameters
  shapeType?: ShapeType;
  color?: string;
  size?: {
    width?: number;
    height?: number;
    radius?: number;
  };
  position?: {
    x: number;
    y: number;
  };
  text?: string;

  // Manipulation parameters
  property?: string;
  value?: any;
  delta?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };

  // Layout parameters
  arrangement?: ArrangementType;
  alignment?: AlignmentType;
  distribution?: DistributionType;
  spacing?: number;

  // Complex command parameters
  template?: TemplateName;
  templateData?: TemplateDefinition;

  // Selection parameters
  criteria?: SelectionCriteria;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Deletion parameters
  target?: DeletionTarget;

  // Style parameters
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontStyle?: string;
  fontFamily?: string;
  align?: string;

  // Utility parameters
  action?: UtilityAction;
  amount?: number;
}

/**
 * Structured AI command object returned from parsing
 */
export interface AICommand {
  category: CommandCategory;
  action: string;
  parameters: CommandParameters;
}

/**
 * Template shape definition for complex commands
 */
export interface TemplateShape {
  type: ShapeType;
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontStyle?: string;
  fontFamily?: string;
  align?: string;
}

/**
 * Template definition for complex multi-shape layouts
 */
export interface TemplateDefinition {
  name: string;
  description?: string;
  shapes: TemplateShape[];
}

/**
 * Context provided to AI for command parsing
 */
export interface AIContext {
  selectedShapes: Array<{
    id: string;
    type: string;
    fill?: string;
    x: number;
    y: number;
  }>;
  viewportCenter: {
    x: number;
    y: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  userId: string;
  canvasId: string;
  userName: string;
  selectedShapeIds: string[];
}

/**
 * AI service response wrapper
 */
export interface AICommandResponse {
  success: boolean;
  command?: AICommand;
  error?: string;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  type?: string;
  selectedIds?: string[];
  updatedIds?: string[];
  deletedIds?: string[];
  createdShapes?: any[];
  action?: UtilityAction;
  amount?: number;
  error?: string;
}

/**
 * Command history entry
 */
export interface CommandHistoryEntry {
  input: string;
  command: AICommand;
  timestamp: number;
  success?: boolean;
  error?: string;
}

/**
 * AI Command Panel state
 */
export interface AICommandState {
  isProcessing: boolean;
  lastCommand: AICommand | null;
  error: string | null;
  commandHistory: CommandHistoryEntry[];
}

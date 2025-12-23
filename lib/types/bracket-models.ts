import { Match } from '@/types/models'

export enum Side {
  HOME = 'home',
  VISITOR = 'visitor'
}

export type ID = string;

export interface SideInfo {
  score?: {
    score: number;
    round1?: number;
    round2?: number;
    round3?: number;
  };

  seed?: {
    displayName: string;
    rank: number;
    sourceGame: Game | null;
    sourcePool: object | null;
  };

  team?: {
    id: ID;
    name: string;
  };

  isDisqualified?: boolean;
}

export interface Game {
  id: ID;
  // the game name
  name: string;
  // optional: the label for the game within the bracket, e.g. Gold Finals, Silver Semi-Finals
  bracketLabel?: string;
  // the unix timestamp of the game-will be transformed to a human-readable time using momentjs
  scheduled: number;

  court?: {
    name: string;
    venue: {
      name: string
    }
  };

  sides: {
    [side in Side]: SideInfo
  };

  // Original match data for reference
  originalMatch?: Match;
}

export interface LineInfo {
  yOffset: number;
  separation: number;
  homeVisitorSpread: number;
}

export interface GameComponentProps {
  game: Game;
  x: number;
  y: number;
  homeOnTop?: boolean;
  // Additional props passed down
  onMatchClick?: (match: Match) => void;
  isOrganizer?: boolean;
  onEditMatch?: (match: Match) => void;
  onSwitchSides?: (match: Match) => void;
  hoveredTeamId?: string | null;
  onHoveredTeamIdChange?: (id: string | null) => void;
}

export type GameComponent = React.ComponentType<GameComponentProps>;

export interface BracketProps {
  game: Game;
  GameComponent?: GameComponent;
  homeOnTop?: boolean;
  gameDimensions?: {
    height: number;
    width: number;
  };
  svgPadding?: number;
  roundSeparatorWidth?: number;
  lineInfo?: LineInfo;

  // Custom props
  onMatchClick?: (match: Match) => void;
  isOrganizer?: boolean;
  onEditMatch?: (match: Match) => void;
  onSwitchSides?: (match: Match) => void;
  hoveredTeamId?: string | null;
  onHoveredTeamIdChange?: (id: string | null) => void;
}

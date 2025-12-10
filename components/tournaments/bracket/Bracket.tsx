import * as React from 'react';
import * as _ from 'underscore';
import BracketGame from './BracketGame';
import { Game, Side, BracketProps, GameComponent, LineInfo } from '@/lib/types/bracket-models';

// Helper to calculate winning path length (depth of the bracket)
function winningPathLength(game: Game, visited: { [ id: string ]: true } = {}): number {
  if (visited[ game.id ]) {
    return 0;
  }

  visited[ game.id ] = true;

  return (
    1 + (
      _.keys(game.sides).length > 0 ?
        Math.max.apply(
          Math,
          _.map(
            game.sides,
            ({ seed }) => (seed && seed.sourceGame) ?
              winningPathLength(seed.sourceGame, visited) : 0
          )
        ) :
        0
    )
  );
};

interface BracketGamesFunctionProps {
  game: Game;
  x: number;
  y: number;
  gameDimensions: { width: number; height: number; }
  roundSeparatorWidth: number;
  round: number;
  homeOnTop: boolean;
  lineInfo: LineInfo;
  GameComponent: GameComponent;
  // Pass-through props
  onMatchClick?: (match: any) => void;
  isOrganizer?: boolean;
  onEditMatch?: (match: any) => void;
  onSwitchSides?: (match: any) => void;
  hoveredTeamId?: string | null;
  onHoveredTeamIdChange?: (id: string | null) => void;
}

const toBracketGames = ({ GameComponent, game, x, y, gameDimensions, roundSeparatorWidth, round, lineInfo, homeOnTop, ...rest }: BracketGamesFunctionProps): React.ReactElement[] => {
  const { width: gameWidth, height: gameHeight } = gameDimensions;

  const ySep = gameHeight * Math.pow(2, round - 2);

  return [
    <g key={`${game.id}-${y}`}>
      <GameComponent
        {...rest}
        game={game} 
        x={x} 
        y={y}
        homeOnTop={homeOnTop} 
      />
    </g>
  ].concat(
    _.chain(game.sides)
      .map((sideInfo, side) => ({ ...sideInfo, side: side as Side }))
      // filter to the teams that come from winning other games
      .filter(({ seed }) => !!(seed && seed.sourceGame))
      .map(
        ({ seed, side }) => {
          const sourceGame = seed!.sourceGame!;
          
          // we put visitor teams on the bottom
          const isTop = side === Side.HOME ? homeOnTop : !homeOnTop;
          const multiplier = isTop ? -1 : 1;

          const pathInfo = [
            `M${x - lineInfo.separation} ${y + gameHeight / 2 + lineInfo.yOffset + multiplier * lineInfo.homeVisitorSpread}`,
            `H${x - (roundSeparatorWidth / 2)}`,
            `V${y + gameHeight / 2 + lineInfo.yOffset + ((ySep / 2) * multiplier)}`,
            `H${x - roundSeparatorWidth + lineInfo.separation}`
          ];

          return [
            <path key={`${game.id}-${side}-${y}-path`} d={pathInfo.join(' ')} fill="transparent" stroke="currentColor" strokeOpacity="0.3"/>
          ]
            .concat(
              toBracketGames(
                {
                  GameComponent,
                  game: sourceGame,
                  homeOnTop,
                  lineInfo,
                  gameDimensions,
                  roundSeparatorWidth,
                  x: x - gameWidth - roundSeparatorWidth,
                  y: y + ((ySep / 2) * multiplier),
                  round: round - 1,
                  ...rest
                }
              )
            );
        }
      )
      .flatten(true)
      .value()
  );
};

/**
 * Displays the bracket that culminates in a particular finals game
 */
export default class Bracket extends React.Component<BracketProps> {
  static defaultProps: Partial<BracketProps> = {
    GameComponent: BracketGame,

    homeOnTop: true,

    gameDimensions: {
      height: 90,
      width: 200
    },

    svgPadding: 20,
    roundSeparatorWidth: 24,

    lineInfo: {
      yOffset: -6,
      separation: 6,
      homeVisitorSpread: 11
    }
  };

  render() {
    const { 
      GameComponent, 
      game, 
      gameDimensions, 
      svgPadding, 
      roundSeparatorWidth, 
      homeOnTop, 
      lineInfo, 
      // Pass-through props
      onMatchClick,
      isOrganizer,
      onEditMatch,
      onSwitchSides,
      hoveredTeamId,
      onHoveredTeamIdChange,
      ...rest 
    } = this.props;

    const numRounds = winningPathLength(game);

    const svgDimensions = {
      height: (gameDimensions!.height * Math.pow(2, numRounds - 1)) + svgPadding! * 2,
      width: (numRounds * (gameDimensions!.width + roundSeparatorWidth!)) + svgPadding! * 2
    };

    return (
      <svg {...svgDimensions} style={{ height: 'auto' }}>
        <g>
          {
            toBracketGames({
              GameComponent: GameComponent!,
              gameDimensions: gameDimensions!,
              roundSeparatorWidth: roundSeparatorWidth!,
              game,
              round: numRounds,
              homeOnTop: homeOnTop!,
              lineInfo: lineInfo!,
              // svgPadding away from the right
              x: svgDimensions.width - svgPadding! - gameDimensions!.width,
              // vertically centered first game
              y: (svgDimensions.height / 2) - gameDimensions!.height / 2,
              
              // Pass-through props
              onMatchClick,
              isOrganizer,
              onEditMatch,
              onSwitchSides,
              hoveredTeamId,
              onHoveredTeamIdChange,

              ...rest
            })
          }
        </g>
      </svg>
    );
  }
}

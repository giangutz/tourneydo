import * as React from 'react';
import { CSSProperties } from 'react';
import * as _ from 'underscore';
import Bracket from './Bracket';
import { Game, BracketProps } from '@/lib/types/bracket-models';
import { Match } from '@/types/models';

// Helper to calculate winning path length (depth of the bracket)
function winningPathLength(game: Game, visited: { [ id: string ]: true } = {}): number {
  if (visited[ game.id ]) {
    return 0;
  }

  visited[ game.id ] = true;

  return (
    1 + (
      _.keys(game.sides).length > 0 ?
        Math.max(
          ..._.map(
            game.sides,
            ({ seed }) => (seed && seed.sourceGame) ?
              winningPathLength(seed.sourceGame, visited) : 0
          )
        ) :
        0
    )
  );
};

const makeFinals = ({ games }: { games: Game[] }): Array<{ game: Game, height: number }> => {
  const isInGroup = (() => {
    const gameIdHash: { [ id: string ]: true } =
      _.reduce(games, (memo, { id }: Game) => ({ ...memo, [ id ]: true }), {} as { [id: string]: true });

    return (id: string) => (gameIdHash[ id ] === true);
  })();

  const gamesFeedInto = _.map(
    games,
    game => ({
      ...game,
      feedsInto: _.filter(
        games,
        ({ id, sides }) => (
          isInGroup(id) &&
          _.any(
            sides,
            ({ seed }) => !!(seed && seed.sourceGame && seed.sourceGame.id === game.id)
          )
        )
      )
    })
  );

  return _.chain(gamesFeedInto)
  // get the games that don't feed into anything else in the group, i.e. finals for this game group
    .filter(({ feedsInto }) => feedsInto.length === 0)
    .map(
      // get their heights
      game => ({
        game,
        height: winningPathLength(game)
      })
    )
    // render the tallest bracket first
    .sortBy(({ height }) => height * -1)
    .value();
};

/**
 * The default title component used for each bracket, receives the game and the height of the bracket
 */
export class BracketTitle extends React.PureComponent<{ game: Game; height: number; }> {
  render() {
    const { game } = this.props;

    return (
      <h3 style={{ textAlign: 'center', marginBottom: '10px' }} className="text-lg font-semibold">
        {game.bracketLabel || 'Bracket'}
      </h3>
    );
  }
}

// Omit utility type
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface BracketGeneratorProps extends Omit<BracketProps, 'game'> {
  games: Game[];
  titleComponent?: React.ComponentType<{ game: Game; height: number; }>;
  style?: CSSProperties;
  
  // Pass-through props
  onMatchClick?: (match: Match) => void;
  isOrganizer?: boolean;
  onEditMatch?: (match: Match) => void;
  onSwitchSides?: (match: Match) => void;
  hoveredTeamId?: string | null;
  onHoveredTeamIdChange?: (id: string | null) => void;
}

/**
 * Displays the brackets for some set of games sorted by bracket height
 */
export default class BracketGenerator extends React.Component<BracketGeneratorProps, { finals: Array<{ game: Game; height: number; }> }> {
  static defaultProps = {
    titleComponent: BracketTitle
  };

  state = {
    finals: makeFinals({ games: this.props.games })
  };

  componentDidUpdate(prevProps: BracketGeneratorProps) {
    if (prevProps.games !== this.props.games) {
      this.setState({ finals: makeFinals({ games: this.props.games }) });
    }
  }

  render() {
    const { 
      games, 
      titleComponent: TitleComponent, 
      style, 
      onMatchClick,
      isOrganizer,
      onEditMatch,
      onSwitchSides,
      hoveredTeamId,
      onHoveredTeamIdChange,
      ...rest 
    } = this.props;
    
    const { finals } = this.state;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', ...style }}>
        {
          _.map(
            finals,
            ({ game, height }) => (
              <div key={game.id} style={{ textAlign: 'center', flexGrow: 1, maxWidth: '100%', marginBottom: '40px' }}>
                {TitleComponent && <TitleComponent game={game} height={height}/>}
                <div style={{ maxWidth: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '20px' }}>
                  <Bracket 
                    game={game} 
                    onMatchClick={onMatchClick}
                    isOrganizer={isOrganizer}
                    onEditMatch={onEditMatch}
                    onSwitchSides={onSwitchSides}
                    hoveredTeamId={hoveredTeamId}
                    onHoveredTeamIdChange={onHoveredTeamIdChange}
                    {...rest}
                  />
                </div>
              </div>
            )
          )
        }
      </div>
    );
  }
}

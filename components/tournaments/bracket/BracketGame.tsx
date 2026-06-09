import * as React from 'react';
import { RectClipped } from './Clipped';
import { Game, Side, SideInfo } from '@/lib/types/bracket-models';
import * as _ from 'underscore';
import { Pencil, ArrowLeftRight, Printer } from 'lucide-react';
import { Match, MatchWithReadiness } from '@/types/models';

interface BracketGameProps {
  game: Game;
  x: number;
  y: number;
  homeOnTop?: boolean;
  hoveredTeamId?: string | null;
  onHoveredTeamIdChange?: (id: string | null) => void;
  onMatchClick?: (match: Match) => void;
  isOrganizer?: boolean;
  onEditMatch?: (match: Match) => void;
  onSwitchSides?: (match: Match) => void;
  
  styles?: {
    backgroundColor: string;
    hoverBackgroundColor: string;
    scoreBackground: string;
    winningScoreBackground: string;
    teamNameStyle: React.CSSProperties;
    teamScoreStyle: React.CSSProperties;
    gameNameStyle: React.CSSProperties;
    gameTimeStyle: React.CSSProperties;
    teamSeparatorStyle: React.CSSProperties;
  };
  topText?: (game: Game) => string;
  bottomText?: (game: Game) => string;
}

const SideComponent = ({ 
  bx, 
  by, 
  side, 
  onHover, 
  isWinner, 
  athleteCalled,
  teamNameStyle,
  teamScoreStyle
}: { 
  bx: number; 
  by: number; 
  side: SideInfo; 
  onHover: (id: string | null) => void; 
  isWinner?: boolean;
  athleteCalled?: boolean;
  teamNameStyle: React.CSSProperties;
  teamScoreStyle: React.CSSProperties;
}) => {
  const tooltip = side.seed && side.team ? <title>{side.seed.displayName}</title> : null;
  const playerName = side.seed ? side.seed.displayName : 'BYE';
  const teamName = side.team ? side.team.name : '';
  
  const isBye = !side.team && !side.seed;

  return (
    <g 
      onMouseEnter={() => side.team && onHover(side.team.id)} 
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* trigger mouse events on the entire block */}
      <rect x={bx} y={by} height={30} width={200} fillOpacity={0}>
        {tooltip}
      </rect>

      <RectClipped x={bx} y={by} height={30} width={170}>
        {/* Player name */}
        <text x={bx + 8} y={by + 16}
              style={{ 
                ...teamNameStyle, 
                fontSize: 12,
                fontStyle: side.seed && side.seed.sourcePool ? 'italic' : undefined,
                fontWeight: isWinner ? 'bold' : 'normal'
              }}>
          {isBye ? 'BYE' : (
            <>
              {side.isDisqualified && <tspan fill="#ef4444" fontWeight="bold">(DQ) </tspan>}
              <tspan style={{ textDecoration: side.isDisqualified ? 'line-through' : 'none', opacity: side.isDisqualified ? 0.7 : 1 }}>
                {playerName}
              </tspan>
            </>
          )}
        </text>
        
        {/* Team name */}
        {!isBye && teamName && (
          <text x={bx + 8} y={by + 26}
                style={{ 
                  ...teamNameStyle, 
                  fontSize: 8,
                  fill: '#aaa',
                  fontWeight: 'normal'
                }}>
            {teamName}
          </text>
        )}
      </RectClipped>

      <text x={bx + 185} y={by + 20} style={teamScoreStyle} textAnchor="middle">
        {side.score ? side.score.score : null}
      </text>
    </g>
  );
};

export default class BracketGame extends React.PureComponent<BracketGameProps> {
  static defaultProps: Partial<BracketGameProps> = {
    homeOnTop: true,
    hoveredTeamId: null,

    styles: {
      backgroundColor: '#58595e',
      hoverBackgroundColor: '#222',
      scoreBackground: '#787a80',
      winningScoreBackground: '#ff7324',
      teamNameStyle: { fill: '#fff', fontSize: 12, textShadow: '1px 1px 1px #222', fontFamily: 'Inter, sans-serif' },
      teamScoreStyle: { fill: '#23252d', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' },
      gameNameStyle: { fill: '#999', fontSize: 10, fontFamily: 'Inter, sans-serif' },
      gameTimeStyle: { fill: '#999', fontSize: 10, fontFamily: 'Inter, sans-serif' },
      teamSeparatorStyle: { stroke: '#444549', strokeWidth: 1 }
    },

    topText: () => '', // Remove date display
    bottomText: ({ name }: Game) => name // Show only match number
  };

  render() {
    const {
      game,
      x,
      y,
      hoveredTeamId,
      onHoveredTeamIdChange,
      onMatchClick,
      isOrganizer,
      onEditMatch,
      onSwitchSides,
      styles,
      homeOnTop,
      topText, 
      bottomText
    } = this.props;

    const { sides, originalMatch } = game as { sides: any, originalMatch: MatchWithReadiness };
    
    // Default styles if not provided
    const defaultStyles = BracketGame.defaultProps.styles!;
    const currentStyles = { ...defaultStyles, ...styles };
    
    const {
      backgroundColor,
      hoverBackgroundColor,
      scoreBackground,
      winningScoreBackground,
      teamNameStyle,
      teamScoreStyle,
      gameNameStyle,
      gameTimeStyle,
      teamSeparatorStyle
    } = currentStyles;

    const top = sides[ homeOnTop ? Side.HOME : Side.VISITOR ];
    const bottom = sides[ homeOnTop ? Side.VISITOR : Side.HOME ];

    // Calculate winner based on round wins (best of 3)
    const topScore = top?.score?.score || 0;
    const bottomScore = bottom?.score?.score || 0;
    
    const hasScores = top?.score && bottom?.score;
    const isTopWinner = hasScores && topScore > bottomScore;
    const isBottomWinner = hasScores && bottomScore > topScore;

    const topHovered = (top && top.team && top.team.id === hoveredTeamId),
      bottomHovered = (bottom && bottom.team && bottom.team.id === hoveredTeamId);

    // Status indicator color
    let statusColor = '#999'; // scheduled
    if (originalMatch?.status === 'in_progress') statusColor = '#22c55e'; // green
    if (originalMatch?.status === 'completed') statusColor = '#3b82f6'; // blue

    // Win method badge label for completed non-SCORE matches (e.g. "KO R1", "TKO R2", "DQ")
    const WIN_METHOD_SHORT: Record<string, string> = {
      KO: 'KO', TKO: 'TKO', DQ: 'DQ', WITHDRAWAL: 'W/D', FORFEIT: 'FF'
    }
    let winMethodBadge: string | null = null
    if (originalMatch?.status === 'completed' && originalMatch?.win_method && originalMatch.win_method !== 'SCORE') {
      const short = WIN_METHOD_SHORT[originalMatch.win_method] ?? originalMatch.win_method
      winMethodBadge = originalMatch.winning_round ? `${short} R${originalMatch.winning_round}` : short
    }

    // Readiness border color (only for CONTEST matches)
    let readinessBorderColor = 'none';
    let readinessBorderWidth = 0;
    if (originalMatch?.lifecycle_state === 'CONTEST') {
      const athlete1Ready = originalMatch.athlete1_called || false;
      const athlete2Ready = originalMatch.athlete2_called || false;
      
      if (athlete1Ready && athlete2Ready) {
        readinessBorderColor = '#22c55e'; // Green - both ready
        readinessBorderWidth = 2;
      } else if (athlete1Ready || athlete2Ready) {
        readinessBorderColor = '#f59e0b'; // Amber - partially ready
        readinessBorderWidth = 2;
      } else {
        readinessBorderColor = '#6b7280'; // Gray - not ready
        readinessBorderWidth = 1;
      }
    }

    return (
      <svg width="200" height="100" viewBox={`0 0 200 100`} x={x} y={y} style={{ overflow: 'visible' }}>
        {/* Click handler for the whole match card */}
        <g onClick={(e) => {
          e.stopPropagation();
          if (onMatchClick && originalMatch) {
            onMatchClick(originalMatch);
          }
        }}>
          {/* Status dot */}
          <circle cx="10" cy="8" r="3" fill={statusColor} />

          {/* Win method badge (e.g. "KO R1", "TKO R2", "DQ") — shown for completed non-SCORE matches */}
          {winMethodBadge && (
            <text x="18" y="11" style={{ fill: '#ef4444', fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>
              {winMethodBadge}
            </text>
          )}

          {/* base background with readiness border */}
          <rect x="0" y="15" width="200" height="60" fill={backgroundColor} rx="3" ry="3" 
                style={{ cursor: 'pointer' }} 
                stroke={readinessBorderColor} 
                strokeWidth={readinessBorderWidth} />

          {/* background for the top team */}
          <rect x="0" y="15" width="200" height="30" fill={topHovered ? hoverBackgroundColor : backgroundColor} rx="3"
                ry="3" style={{ cursor: 'pointer' }} />
          {/* background for the bottom team */}
          <rect x="0" y="45" width="200" height="30" fill={bottomHovered ? hoverBackgroundColor : backgroundColor}
                rx="3" ry="3" style={{ cursor: 'pointer' }} />

          {/* scores background */}
          <rect x="170" y="15" width="30" height="60" fill={scoreBackground} rx="3" ry="3" />

          {/* winner background */}
          {(hasScores && topScore !== bottomScore) ? (
            isTopWinner ?
              <rect x="170" y="15" width="30" height="30" style={{ fill: winningScoreBackground }} rx="3" ry="3"/> :
              <rect x="170" y="45" width="30" height="30" style={{ fill: winningScoreBackground }} rx="3" ry="3"/>
          ) : null}

          {/* the players */}
          {
            top ? (
              <SideComponent 
                bx={0} by={15} side={top} 
                onHover={onHoveredTeamIdChange || (() => {})} 
                isWinner={isTopWinner} 
                athleteCalled={homeOnTop ? originalMatch?.athlete1_called : originalMatch?.athlete2_called}
                teamNameStyle={teamNameStyle}
                teamScoreStyle={teamScoreStyle}
              />
            ) : null
          }

          {
            bottom ? (
              <SideComponent 
                bx={0} by={45} side={bottom} 
                onHover={onHoveredTeamIdChange || (() => {})} 
                isWinner={isBottomWinner} 
                athleteCalled={homeOnTop ? originalMatch?.athlete2_called : originalMatch?.athlete1_called}
                teamNameStyle={teamNameStyle}
                teamScoreStyle={teamScoreStyle}
              />
            ) : null
          }

          <line x1="0" y1="45" x2="200" y2="45" style={teamSeparatorStyle}/>

          {/* game name - show only match number */}
          <text x="100" y="88" textAnchor="middle" style={gameNameStyle}>
            {bottomText ? bottomText(game) : ''}
          </text>
        </g>
        
        {/* Action buttons (only visible for organizer) */}
        {isOrganizer && originalMatch && (
          <foreignObject x="100" y="-22" width="115" height="30">
            <div className="flex justify-end gap-2">
              {/* Print match slip — only when both players are confirmed */}
              {originalMatch.player1_id && originalMatch.player2_id && (
                <button
                  className="bg-white text-gray-700 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300 rounded-md p-1.5 shadow-md border-2 border-gray-300 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `/print/tournament/${originalMatch.tournament_id}?mode=slip&match=${originalMatch.id}`,
                      '_blank'
                    );
                  }}
                  title="Print match slip"
                >
                  <Printer size={14} />
                </button>
              )}
              {/* Switch sides button */}
              {onSwitchSides && (
                <button
                  className="bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 rounded-md p-1.5 shadow-md border-2 border-gray-300 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchSides(originalMatch);
                  }}
                  title="Switch Places / Edit Participants"
                >
                  <ArrowLeftRight size={14} />
                </button>
              )}
              {/* Edit match button */}
              {onEditMatch && (
                <button
                  className="bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-300 rounded-md p-1.5 shadow-md border-2 border-gray-300 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMatch(originalMatch);
                  }}
                  title="Edit Scores"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </foreignObject>
        )}
      </svg>
    );
  }
}


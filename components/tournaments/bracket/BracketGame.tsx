import * as React from 'react';
import { RectClipped } from './Clipped';
import { Game, Side, SideInfo } from '@/lib/types/bracket-models';
import * as _ from 'underscore';
import { Pencil, ArrowLeftRight } from 'lucide-react';
import { Match } from '@/types/models';

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

export default class BracketGame extends React.PureComponent<BracketGameProps> {
  static defaultProps: Partial<BracketGameProps> = {
    homeOnTop: true,
    hoveredTeamId: null,

    styles: {
      backgroundColor: '#58595e',
      hoverBackgroundColor: '#222',
      scoreBackground: '#787a80',
      winningScoreBackground: '#ff7324',
      teamNameStyle: { fill: '#fff', fontSize: 14, textShadow: '1px 1px 1px #222', fontFamily: 'Inter, sans-serif' },
      teamScoreStyle: { fill: '#23252d', fontSize: 14, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' },
      gameNameStyle: { fill: '#999', fontSize: 11, fontFamily: 'Inter, sans-serif' },
      gameTimeStyle: { fill: '#999', fontSize: 11, fontFamily: 'Inter, sans-serif' },
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

    const { sides, originalMatch } = game;
    
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
    // The score object in SideInfo now contains the number of rounds won
    const topScore = top?.score?.score || 0;
    const bottomScore = bottom?.score?.score || 0;
    
    const hasScores = top?.score && bottom?.score;
    const isTopWinner = hasScores && topScore > bottomScore;
    const isBottomWinner = hasScores && bottomScore > topScore;

    const winnerBackground = (hasScores && topScore !== bottomScore) ?
      (
        isTopWinner ?
          <rect x={x + 170} y={y + 12} width="30" height="22.5" style={{ fill: winningScoreBackground }} rx="3" ry="3"/> :
          <rect x={x + 170} y={y + 34.5} width="30" height="22.5" style={{ fill: winningScoreBackground }} rx="3" ry="3"/>
      ) :
      null;

    interface SideComponentProps {
      bx: number;
      by: number;
      side: SideInfo;
      onHover: (id: string | null) => void;
      isWinner?: boolean;
    }

    const SideComponent = ({ bx, by, side, onHover, isWinner }: SideComponentProps) => {
      const tooltip = side.seed && side.team ? <title>{side.seed.displayName}</title> : null;
      const playerName = side.seed ? side.seed.displayName : 'BYE';
      const teamName = side.team ? side.team.name : '';
      
      // If it's a BYE, show it differently
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

          <RectClipped x={bx} y={by} height={30} width={165}>
            {/* Player name */}
            <text x={bx + 8} y={by + 15}
                  style={{ 
                    ...teamNameStyle, 
                    fontSize: 13,
                    fontStyle: side.seed && side.seed.sourcePool ? 'italic' : undefined,
                    fontWeight: isWinner ? 'bold' : 'normal'
                  }}>
              {isBye ? 'BYE' : playerName}
            </text>
            
            {/* Team name - only show if not a BYE */}
            {!isBye && teamName && (
              <text x={bx + 8} y={by + 26}
                    style={{ 
                      ...teamNameStyle, 
                      fontSize: 9,
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

    const topHovered = (top && top.team && top.team.id === hoveredTeamId),
      bottomHovered = (bottom && bottom.team && bottom.team.id === hoveredTeamId);

    // Status indicator color
    let statusColor = '#999'; // scheduled
    if (originalMatch?.status === 'in_progress') statusColor = '#22c55e'; // green
    if (originalMatch?.status === 'completed') statusColor = '#3b82f6'; // blue

    return (
      <svg width="200" height="90" viewBox={`0 0 200 90`} x={x} y={y} style={{ overflow: 'visible' }}>
        {/* Click handler for the whole match card */}
        <g onClick={(e) => {
          e.stopPropagation();
          if (onMatchClick && originalMatch) {
            onMatchClick(originalMatch);
          }
        }}>
          {/* Status dot - removed date text */}
          <circle cx="10" cy="8" r="3" fill={statusColor} />

          {/* backgrounds */}

          {/* base background */}
          <rect x="0" y="15" width="200" height="60" fill={backgroundColor} rx="3" ry="3" 
                style={{ cursor: 'pointer' }} stroke={originalMatch?.status === 'in_progress' ? '#22c55e' : 'none'} strokeWidth={1} />

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
              <SideComponent bx={0} by={15} side={top} onHover={onHoveredTeamIdChange || (() => {})} isWinner={isTopWinner} />
            ) : null
          }

          {
            bottom ? (
              <SideComponent bx={0} by={45} side={bottom} onHover={onHoveredTeamIdChange || (() => {})} isWinner={isBottomWinner} />
            ) : null
          }

          <line x1="0" y1="45" x2="200" y2="45" style={teamSeparatorStyle}/>

          {/* game name - show only match number */}
          <text x="100" y="86" textAnchor="middle" style={gameNameStyle}>
            {bottomText ? bottomText(game) : ''}
          </text>
        </g>
        
        {/* Action buttons (only visible for organizer) */}
        {isOrganizer && originalMatch && (
          <foreignObject x="160" y="0" width="50" height="20">
            <div className="flex justify-end gap-1">
              {/* Switch sides button */}
              {onSwitchSides && (
                <button 
                  className="bg-white text-gray-700 hover:bg-gray-100 rounded-full p-0.5 shadow-sm border border-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchSides(originalMatch);
                  }}
                  title="Switch Places / Edit Participants"
                >
                  <ArrowLeftRight size={10} />
                </button>
              )}
              {/* Edit match button */}
              {onEditMatch && (
                <button 
                  className="bg-white text-gray-700 hover:bg-gray-100 rounded-full p-0.5 shadow-sm border border-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMatch(originalMatch);
                  }}
                  title="Edit Scores"
                >
                  <Pencil size={10} />
                </button>
              )}
            </div>
          </foreignObject>
        )}
      </svg>
    );
  }
}

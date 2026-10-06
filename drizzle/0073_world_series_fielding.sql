-- Fielding for World Series Game 1, the way 0071 did the semifinals.
--
-- Counted off the other side's at-bats: a putout goes to whoever took the last
-- throw, so "GO 4-3" is the first baseman and "FC 8-4" the second, a strikeout
-- is the catcher's, and an error belongs to the position named in "E5".
--
-- Who was standing where comes from the pitching lines plus the position notes,
-- and for once it is exact rather than right-to-the-inning. Ethan's 3.1 innings
-- end on the first out of the 4th, which is where the three (SUB) moves happen:
-- Little leaves centre for the mound, Girty goes second to centre, Ethan comes
-- off the mound to second. The (I6) moves are the 6th: Joshy leaves left for the
-- mound, Girty centre to left, Little back to centre. Hershey's five (I5) moves
-- are all at the top of the 5th, with Gabe to the bench and Aarbear in at centre
-- taking his place in the order.
--
-- So the Panthers field three alignments - ten outs, then five, then three - and
-- the Otters two, twelve and six. Both sides' position_outs come to 162, which
-- is nine men for eighteen outs, and both sides' putouts come to 18.

UPDATE historical_game_stats SET putouts = 12, errors = 0, position_outs = '{"C":18}'                WHERE kind='BATTING' AND player_name='peejamillion'  AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  2, errors = 0, position_outs = '{"2B":10,"CF":5,"LF":3}' WHERE kind='BATTING' AND player_name='Girty'         AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  1, errors = 0, position_outs = '{"RF":18}'               WHERE kind='BATTING' AND player_name='dcjenk22'      AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  1, errors = 1, position_outs = '{"SS":18}'               WHERE kind='BATTING' AND player_name='Rebtsuna'      AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  1, errors = 0, position_outs = '{"1B":18}'               WHERE kind='BATTING' AND player_name='KexKK'         AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  1, errors = 0, position_outs = '{"P":10,"2B":8}'         WHERE kind='BATTING' AND player_name='EthanS22'      AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 0, position_outs = '{"LF":15,"P":3}'         WHERE kind='BATTING' AND player_name='Joshygg'       AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 0, position_outs = '{"CF":13,"P":5}'         WHERE kind='BATTING' AND player_name='_littL_'       AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 0, position_outs = '{"3B":18}'               WHERE kind='BATTING' AND player_name='NoScopeMason1' AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');

UPDATE historical_game_stats SET putouts =  6, errors = 0, position_outs = '{"RF":12,"C":6}'         WHERE kind='BATTING' AND player_name='pogJ'           AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  4, errors = 0, position_outs = '{"CF":12,"RF":6}'        WHERE kind='BATTING' AND player_name='SonicBoss101'   AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  4, errors = 0, position_outs = '{"C":12,"1B":6}'         WHERE kind='BATTING' AND player_name='Donkeymario65'  AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  2, errors = 0, position_outs = '{"CF":6}'                WHERE kind='BATTING' AND player_name='AarBear426'     AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  1, errors = 0, position_outs = '{"P":18}'                WHERE kind='BATTING' AND player_name='IcedFlxme'      AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  1, errors = 0, position_outs = '{"LF":18}'               WHERE kind='BATTING' AND player_name='Uchime'         AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 1, position_outs = '{"3B":18}'               WHERE kind='BATTING' AND player_name='bmodep6'        AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 0, position_outs = '{"2B":18}'               WHERE kind='BATTING' AND player_name='Weers'          AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 0, position_outs = '{"SS":18}'               WHERE kind='BATTING' AND player_name='xx6tttsahur7xx' AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');
UPDATE historical_game_stats SET putouts =  0, errors = 0, position_outs = '{"1B":12}'               WHERE kind='BATTING' AND player_name='omgitsgabee'    AND game_id=(SELECT id FROM historical_games WHERE source_game_id='WS-G1');

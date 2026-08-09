-- Blast Riff — seed questions for testing
-- 10 hand-written, fact-checked trivia questions across genres and difficulties.
-- youtube_url / spotify_url / apple_music_url / source_url are left NULL: they are
-- not populated with guessed links here and should be filled in with verified URLs
-- before shipping to production.

insert into questions
  (question_text, options, correct_option, explanation, difficulty, genre, question_type, tags, language, related_band, related_album, related_song, related_year, verified, ai_generated)
values
(
  'Which band released the 1986 album "Master of Puppets"?',
  '[{"id":"a","text":"Metallica"},{"id":"b","text":"Megadeth"},{"id":"c","text":"Slayer"},{"id":"d","text":"Anthrax"}]'::jsonb,
  'a',
  '"Master of Puppets" is Metallica''s third studio album, released in March 1986, and is widely regarded as one of the most influential thrash metal records ever made.',
  'easy', 'thrash metal', 'multiple_choice', array['metallica','80s','album'], 'en',
  'Metallica', 'Master of Puppets', null, 1986, true, false
),
(
  'Iron Maiden''s longtime mascot is known by what name?',
  '[{"id":"a","text":"Eddie"},{"id":"b","text":"Vic"},{"id":"c","text":"Trooper"},{"id":"d","text":"Aces High Man"}]'::jsonb,
  'a',
  'Eddie has appeared on nearly every Iron Maiden album cover and stage show since the band''s 1980 debut.',
  'medium', 'NWOBHM', 'multiple_choice', array['iron maiden','mascot'], 'en',
  'Iron Maiden', null, null, null, true, false
),
(
  'Which band is credited as pioneers of doom metal with their self-titled 1970 debut album?',
  '[{"id":"a","text":"Black Sabbath"},{"id":"b","text":"Candlemass"},{"id":"c","text":"Saint Vitus"},{"id":"d","text":"Trouble"}]'::jsonb,
  'a',
  'Black Sabbath''s self-titled 1970 debut, built on Tony Iommi''s detuned, ominous riffs, is widely regarded as the birth of doom metal.',
  'medium', 'doom metal', 'multiple_choice', array['black sabbath','70s','album'], 'en',
  'Black Sabbath', 'Black Sabbath', null, 1970, true, false
),
(
  'Mayhem guitarist Øystein "Euronymous" Aarseth was murdered in 1993 by a former bassist of which band?',
  '[{"id":"a","text":"Burzum"},{"id":"b","text":"Darkthrone"},{"id":"c","text":"Emperor"},{"id":"d","text":"Immortal"}]'::jsonb,
  'a',
  'Varg Vikernes of Burzum killed Euronymous in Oslo in August 1993, one of the defining and darkest events in black metal history.',
  'hard', 'black metal', 'multiple_choice', array['mayhem','burzum','history'], 'en',
  'Mayhem', null, null, 1993, true, false
),
(
  'Death, often called the "Father of Death Metal," was founded and fronted by which guitarist and vocalist?',
  '[{"id":"a","text":"Chuck Schuldiner"},{"id":"b","text":"Chris Barnes"},{"id":"c","text":"Glen Benton"},{"id":"d","text":"Trey Azagthoth"}]'::jsonb,
  'a',
  'Chuck Schuldiner founded Death in 1983 and is widely credited as a foundational figure of the death metal genre until his passing in 2001.',
  'medium', 'death metal', 'multiple_choice', array['death','chuck schuldiner'], 'en',
  'Death', null, null, null, true, false
),
(
  'Which German band is known for the landmark power metal album "Keeper of the Seven Keys"?',
  '[{"id":"a","text":"Helloween"},{"id":"b","text":"Blind Guardian"},{"id":"c","text":"Gamma Ray"},{"id":"d","text":"Rhapsody of Fire"}]'::jsonb,
  'a',
  'Helloween''s "Keeper of the Seven Keys Part I & II" (1987-1988) helped define the fast, melodic European power metal sound.',
  'easy', 'power metal', 'multiple_choice', array['helloween','german metal'], 'en',
  'Helloween', 'Keeper of the Seven Keys', null, 1987, true, false
),
(
  'Pantera''s 1990 album "Cowboys from Hell" is often cited as a landmark record for which subgenre?',
  '[{"id":"a","text":"Groove metal"},{"id":"b","text":"Nu metal"},{"id":"c","text":"Sludge metal"},{"id":"d","text":"Metalcore"}]'::jsonb,
  'a',
  '"Cowboys from Hell" marked Pantera''s shift away from their glam roots toward a heavier, groove-driven sound that helped define groove metal.',
  'medium', 'groove metal', 'multiple_choice', array['pantera','album'], 'en',
  'Pantera', 'Cowboys from Hell', null, 1990, true, false
),
(
  'Which glam metal band released the power ballad "Every Rose Has Its Thorn"?',
  '[{"id":"a","text":"Poison"},{"id":"b","text":"Mötley Crüe"},{"id":"c","text":"Ratt"},{"id":"d","text":"Warrant"}]'::jsonb,
  'a',
  '"Every Rose Has Its Thorn" appeared on Poison''s 1988 album "Open Up and Say... Ahh!" and reached number one on the Billboard Hot 100.',
  'easy', 'glam metal', 'multiple_choice', array['poison','ballad'], 'en',
  'Poison', 'Open Up and Say... Ahh!', 'Every Rose Has Its Thorn', 1988, true, false
),
(
  'Which band''s 1988 concept album "Operation: Mindcrime" tells the story of a heroin addict manipulated into political assassinations?',
  '[{"id":"a","text":"Queensrÿche"},{"id":"b","text":"Dream Theater"},{"id":"c","text":"Fates Warning"},{"id":"d","text":"Savatage"}]'::jsonb,
  'a',
  'Queensrÿche''s "Operation: Mindcrime" is a landmark progressive metal concept album about political conspiracy, addiction, and murder.',
  'hard', 'progressive metal', 'multiple_choice', array['queensryche','concept album'], 'en',
  'Queensrÿche', 'Operation: Mindcrime', null, 1988, true, false
),
(
  'In what year did Judas Priest frontman Rob Halford publicly come out as gay during an MTV interview?',
  '[{"id":"a","text":"1998"},{"id":"b","text":"1995"},{"id":"c","text":"2001"},{"id":"d","text":"1990"}]'::jsonb,
  'a',
  'Rob Halford came out publicly in 1998, making him one of the first prominent heavy metal frontmen to do so.',
  'hard', 'heavy metal', 'multiple_choice', array['judas priest','history'], 'en',
  'Judas Priest', null, null, 1998, true, false
);

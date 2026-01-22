# Scheduler Stress Test Report

**Matches Scheduled**: 500 / 500 (Note: Overflow handled internally? Or returned partial? The util returns assignments. If strict, overflows skipped? No, strict usually returns overflow object. assignMatchNumbers wraps it and might filter? Check logic. Actually assignMatchNumbers returns assignments list. If overflow happens in calculateSchedule, they are in 'overflow' object not assignments list. We should check that.)

**Time Taken**: 25ms
**Days Required**: 4 days
**Courts Used**: 4 courts

## Schedule Breakdown

### Day 1

#### Court 1

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **101** | 9:00 AM | Gradeschool | Fin Weight | White | R1 |
| **102** | 9:10 AM | Junior | Heavy Weight | Red | R1 |
| **103** | 9:25 AM | Cadet | Feather Weight | Blue | R1 |
| **104** | 9:35 AM | Senior | Fly Weight | Black | R1 |
| **105** | 9:50 AM | Senior | Feather Weight | Black | R1 |
| **106** | 10:05 AM | Gradeschool | Middle Weight | Red | R1 |
| **107** | 10:15 AM | Gradeschool | Middle Weight | White | R1 |
| **108** | 10:25 AM | Cadet | Light Weight | Red | R1 |
| **109** | 10:35 AM | Junior | Feather Weight | Yellow | R1 |
| **110** | 10:50 AM | Senior | Middle Weight | Blue | R1 |
| **111** | 11:05 AM | Senior | Middle Weight | Black | R1 |
| **112** | 11:20 AM | Gradeschool | Fin Weight | White | R2 |
| **113** | 11:30 AM | Junior | Heavy Weight | Red | R2 |
| **114** | 11:45 AM | Cadet | Heavy Weight | White | R2 |
| **115** | 11:55 AM | Cadet | Heavy Weight | Red | R2 |
| **116** | 12:05 PM | Senior | Fin Weight | Black | R2 |
| **117** | 12:20 PM | Cadet | Light Weight | Blue | R2 |
| **118** | 12:30 PM | Gradeschool | Middle Weight | Red | R2 |
| **119** | 12:40 PM | Cadet | Fly Weight | Yellow | R2 |
| **120** | 12:50 PM | Cadet | Light Weight | Blue | R2 |
| **121** | 1:00 PM | Junior | Feather Weight | Yellow | R2 |
| **122** | 1:15 PM | Gradeschool | Welter Weight | White | R2 |
| **123** | 1:25 PM | Gradeschool | Fin Weight | Black | R2 |
| **124** | 1:35 PM | Junior | Heavy Weight | Blue | R3 |
| **125** | 1:50 PM | Gradeschool | Fin Weight | Blue | R3 |
| **126** | 2:00 PM | Cadet | Heavy Weight | Blue | R3 |
| **127** | 2:10 PM | Senior | Fin Weight | White | R3 |
| **128** | 2:25 PM | Senior | Fly Weight | Blue | R3 |
| **129** | 2:40 PM | Senior | Feather Weight | Yellow | R3 |
| **130** | 2:55 PM | Gradeschool | Bantam Weight | Yellow | R3 |
| **131** | 3:05 PM | Cadet | Light Weight | Blue | R3 |
| **132** | 3:15 PM | Senior | Light Weight | Blue | R3 |
| **133** | 3:30 PM | Gradeschool | Middle Weight | Blue | R3 |
| **134** | 3:40 PM | Gradeschool | Middle Weight | White | R3 |
| **135** | 3:50 PM | Cadet | Fly Weight | White | R3 |
| **136** | 4:00 PM | Cadet | Light Weight | White | R3 |
| **137** | 4:10 PM | Junior | Feather Weight | Red | R3 |
| **138** | 4:25 PM | Gradeschool | Welter Weight | Yellow | R3 |
| **139** | 4:35 PM | Gradeschool | Welter Weight | Yellow | R3 |

#### Court 2

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **201** | 9:00 AM | Gradeschool | Fin Weight | White | R1 |
| **202** | 9:10 AM | Junior | Heavy Weight | Yellow | R1 |
| **203** | 9:25 AM | Cadet | Feather Weight | Red | R1 |
| **204** | 9:35 AM | Senior | Fin Weight | Black | R1 |
| **205** | 9:50 AM | Gradeschool | Bantam Weight | Blue | R1 |
| **206** | 10:00 AM | Junior | Fin Weight | White | R1 |
| **207** | 10:15 AM | Cadet | Fly Weight | Black | R1 |
| **208** | 10:25 AM | Cadet | Light Weight | Yellow | R1 |
| **209** | 10:35 AM | Junior | Feather Weight | Yellow | R1 |
| **210** | 10:50 AM | Senior | Middle Weight | Yellow | R1 |
| **211** | 11:05 AM | Gradeschool | Welter Weight | Black | R1 |
| **212** | 11:15 AM | Junior | Fin Weight | Yellow | R1 |
| **213** | 11:30 AM | Junior | Heavy Weight | White | R2 |
| **214** | 11:45 AM | Cadet | Feather Weight | Red | R2 |
| **215** | 11:55 AM | Senior | Fin Weight | White | R2 |
| **216** | 12:10 PM | Senior | Feather Weight | Blue | R2 |
| **217** | 12:25 PM | Junior | Fin Weight | Black | R2 |
| **218** | 12:40 PM | Cadet | Fly Weight | White | R2 |
| **219** | 12:50 PM | Cadet | Light Weight | Blue | R2 |
| **220** | 1:00 PM | Junior | Feather Weight | Black | R2 |
| **221** | 1:15 PM | Senior | Middle Weight | Blue | R2 |
| **222** | 1:30 PM | Gradeschool | Fin Weight | Yellow | R3 |
| **223** | 1:40 PM | Junior | Heavy Weight | Black | R3 |
| **224** | 1:55 PM | Cadet | Feather Weight | Yellow | R3 |
| **225** | 2:05 PM | Cadet | Heavy Weight | Red | R3 |
| **226** | 2:15 PM | Senior | Fin Weight | Red | R3 |
| **227** | 2:30 PM | Senior | Feather Weight | White | R3 |
| **228** | 2:45 PM | Senior | Feather Weight | White | R3 |
| **229** | 3:00 PM | Cadet | Light Weight | White | R3 |
| **230** | 3:10 PM | Cadet | Light Weight | Black | R3 |
| **231** | 3:20 PM | Senior | Light Weight | Yellow | R3 |
| **232** | 3:35 PM | Gradeschool | Middle Weight | Yellow | R3 |
| **233** | 3:45 PM | Cadet | Fly Weight | White | R3 |
| **234** | 3:55 PM | Cadet | Fly Weight | Red | R3 |
| **235** | 4:05 PM | Cadet | Light Weight | Blue | R3 |
| **236** | 4:15 PM | Senior | Middle Weight | White | R3 |
| **237** | 4:30 PM | Gradeschool | Welter Weight | Blue | R3 |

#### Court 3

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **301** | 9:00 AM | Gradeschool | Fin Weight | White | R1 |
| **302** | 9:10 AM | Junior | Heavy Weight | Yellow | R1 |
| **303** | 9:25 AM | Cadet | Heavy Weight | Blue | R1 |
| **304** | 9:35 AM | Cadet | Heavy Weight | Yellow | R1 |
| **305** | 9:45 AM | Senior | Fly Weight | Red | R1 |
| **306** | 10:00 AM | Gradeschool | Middle Weight | Yellow | R1 |
| **307** | 10:10 AM | Gradeschool | Middle Weight | Yellow | R1 |
| **308** | 10:20 AM | Cadet | Fly Weight | Blue | R1 |
| **309** | 10:30 AM | Cadet | Light Weight | Black | R1 |
| **310** | 10:40 AM | Junior | Feather Weight | White | R1 |
| **311** | 10:55 AM | Junior | Feather Weight | Red | R1 |
| **312** | 11:10 AM | Gradeschool | Welter Weight | Blue | R1 |
| **313** | 11:20 AM | Gradeschool | Fin Weight | Blue | R2 |
| **314** | 11:30 AM | Junior | Heavy Weight | Black | R2 |
| **315** | 11:45 AM | Cadet | Feather Weight | Red | R2 |
| **316** | 11:55 AM | Cadet | Heavy Weight | Red | R2 |
| **317** | 12:05 PM | Cadet | Feather Weight | Yellow | R2 |
| **318** | 12:15 PM | Cadet | Light Weight | Yellow | R2 |
| **319** | 12:25 PM | Junior | Fin Weight | Black | R2 |
| **320** | 12:40 PM | Cadet | Fly Weight | Yellow | R2 |
| **321** | 12:50 PM | Cadet | Light Weight | White | R2 |
| **322** | 1:00 PM | Junior | Feather Weight | Blue | R2 |
| **323** | 1:15 PM | Senior | Middle Weight | Red | R2 |
| **324** | 1:30 PM | Gradeschool | Fin Weight | White | R3 |
| **325** | 1:40 PM | Junior | Heavy Weight | Yellow | R3 |
| **326** | 1:55 PM | Cadet | Feather Weight | Red | R3 |
| **327** | 2:05 PM | Cadet | Heavy Weight | Yellow | R3 |
| **328** | 2:15 PM | Senior | Fly Weight | White | R3 |
| **329** | 2:30 PM | Senior | Fly Weight | Black | R3 |
| **330** | 2:45 PM | Gradeschool | Bantam Weight | White | R3 |
| **331** | 2:55 PM | Gradeschool | Bantam Weight | Yellow | R3 |
| **332** | 3:05 PM | Cadet | Light Weight | Black | R3 |
| **333** | 3:15 PM | Junior | Fin Weight | Yellow | R3 |
| **334** | 3:30 PM | Gradeschool | Middle Weight | Yellow | R3 |
| **335** | 3:40 PM | Gradeschool | Middle Weight | White | R3 |
| **336** | 3:50 PM | Cadet | Fly Weight | Blue | R3 |
| **337** | 4:00 PM | Cadet | Fly Weight | Black | R3 |
| **338** | 4:10 PM | Senior | Middle Weight | Yellow | R3 |
| **339** | 4:25 PM | Senior | Middle Weight | Red | R3 |

#### Court 4

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **401** | 9:00 AM | Gradeschool | Fin Weight | Black | R1 |
| **402** | 9:10 AM | Junior | Heavy Weight | White | R1 |
| **403** | 9:25 AM | Cadet | Heavy Weight | Black | R1 |
| **404** | 9:35 AM | Cadet | Heavy Weight | Yellow | R1 |
| **405** | 9:45 AM | Senior | Feather Weight | Black | R1 |
| **406** | 10:00 AM | Senior | Light Weight | White | R1 |
| **407** | 10:15 AM | Cadet | Fly Weight | Black | R1 |
| **408** | 10:25 AM | Cadet | Light Weight | Black | R1 |
| **409** | 10:35 AM | Junior | Feather Weight | Yellow | R1 |
| **410** | 10:50 AM | Senior | Middle Weight | Black | R1 |
| **411** | 11:05 AM | Gradeschool | Welter Weight | White | R1 |
| **412** | 11:15 AM | Gradeschool | Fin Weight | White | R2 |
| **413** | 11:25 AM | Gradeschool | Fin Weight | Red | R2 |
| **414** | 11:35 AM | Cadet | Feather Weight | White | R2 |
| **415** | 11:45 AM | Cadet | Feather Weight | Yellow | R2 |
| **416** | 11:55 AM | Senior | Fin Weight | Yellow | R2 |
| **417** | 12:10 PM | Senior | Fly Weight | Yellow | R2 |
| **418** | 12:25 PM | Gradeschool | Middle Weight | Blue | R2 |
| **419** | 12:35 PM | Gradeschool | Middle Weight | White | R2 |
| **420** | 12:45 PM | Cadet | Fly Weight | Yellow | R2 |
| **421** | 12:55 PM | Cadet | Light Weight | Blue | R2 |
| **422** | 1:05 PM | Senior | Middle Weight | Black | R2 |
| **423** | 1:20 PM | Gradeschool | Welter Weight | Yellow | R2 |
| **424** | 1:30 PM | Gradeschool | Fin Weight | Red | R3 |
| **425** | 1:40 PM | Junior | Heavy Weight | Black | R3 |
| **426** | 1:55 PM | Cadet | Feather Weight | White | R3 |
| **427** | 2:05 PM | Senior | Fin Weight | Blue | R3 |
| **428** | 2:20 PM | Senior | Fly Weight | Red | R3 |
| **429** | 2:35 PM | Senior | Feather Weight | Black | R3 |
| **430** | 2:50 PM | Gradeschool | Bantam Weight | White | R3 |
| **431** | 3:00 PM | Gradeschool | Bantam Weight | Blue | R3 |
| **432** | 3:10 PM | Junior | Fin Weight | Blue | R3 |
| **433** | 3:25 PM | Senior | Light Weight | Black | R3 |
| **434** | 3:40 PM | Gradeschool | Middle Weight | Red | R3 |
| **435** | 3:50 PM | Cadet | Fly Weight | Blue | R3 |
| **436** | 4:00 PM | Cadet | Light Weight | White | R3 |
| **437** | 4:10 PM | Junior | Feather Weight | Yellow | R3 |
| **438** | 4:25 PM | Gradeschool | Welter Weight | Black | R3 |
| **439** | 4:35 PM | Gradeschool | Welter Weight | Blue | R3 |

### Day 2

#### Court 1

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **101** | 9:00 AM | Senior | Feather Weight | White | R1 |
| **102** | 9:15 AM | Gradeschool | Heavy Weight | Yellow | R1 |
| **103** | 9:25 AM | Gradeschool | Heavy Weight | Yellow | R1 |
| **104** | 9:35 AM | Gradeschool | Feather Weight | White | R1 |
| **105** | 9:45 AM | Gradeschool | Heavy Weight | Black | R1 |
| **106** | 9:55 AM | Junior | Welter Weight | Blue | R1 |
| **107** | 10:10 AM | Cadet | Welter Weight | Yellow | R1 |
| **108** | 10:20 AM | Senior | Bantam Weight | Blue | R1 |
| **109** | 10:35 AM | Gradeschool | Fly Weight | Black | R1 |
| **110** | 10:45 AM | Senior | Welter Weight | Yellow | R1 |
| **111** | 11:00 AM | Senior | Heavy Weight | Blue | R2 |
| **112** | 11:15 AM | Senior | Fin Weight | Blue | R2 |
| **113** | 11:30 AM | Gradeschool | Feather Weight | White | R2 |
| **114** | 11:40 AM | Gradeschool | Heavy Weight | Blue | R2 |
| **115** | 11:50 AM | Senior | Fly Weight | Red | R2 |
| **116** | 12:05 PM | Senior | Bantam Weight | Black | R2 |
| **117** | 12:20 PM | Senior | Welter Weight | White | R2 |
| **118** | 12:35 PM | Gradeschool | Welter Weight | Red | R2 |
| **119** | 12:45 PM | Cadet | Welter Weight | Blue | R2 |
| **120** | 12:55 PM | Gradeschool | Fly Weight | Red | R2 |
| **121** | 1:05 PM | Senior | Welter Weight | Black | R2 |
| **122** | 1:20 PM | Cadet | Fin Weight | Yellow | R2 |
| **123** | 1:30 PM | Senior | Feather Weight | White | R3 |
| **124** | 1:45 PM | Senior | Feather Weight | Blue | R3 |
| **125** | 2:00 PM | Senior | Heavy Weight | Yellow | R3 |
| **126** | 2:15 PM | Senior | Fin Weight | Blue | R3 |
| **127** | 2:30 PM | Gradeschool | Heavy Weight | Blue | R3 |
| **128** | 2:40 PM | Gradeschool | Heavy Weight | Red | R3 |
| **129** | 2:50 PM | Senior | Fly Weight | Black | R3 |
| **130** | 3:05 PM | Cadet | Welter Weight | Yellow | R3 |
| **131** | 3:15 PM | Gradeschool | Welter Weight | Yellow | R3 |
| **132** | 3:25 PM | Cadet | Welter Weight | Red | R3 |
| **133** | 3:35 PM | Gradeschool | Feather Weight | Blue | R3 |
| **134** | 3:45 PM | Gradeschool | Fly Weight | Blue | R3 |
| **135** | 3:55 PM | Gradeschool | Fly Weight | Red | R3 |
| **136** | 4:05 PM | Gradeschool | Fly Weight | Blue | R3 |
| **137** | 4:15 PM | Senior | Welter Weight | Red | R3 |
| **138** | 4:30 PM | Cadet | Fin Weight | White | R3 |

#### Court 2

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **201** | 9:00 AM | Senior | Heavy Weight | White | R1 |
| **202** | 9:15 AM | Senior | Fin Weight | Black | R1 |
| **203** | 9:30 AM | Gradeschool | Heavy Weight | Red | R1 |
| **204** | 9:40 AM | Gradeschool | Heavy Weight | White | R1 |
| **205** | 9:50 AM | Cadet | Heavy Weight | White | R1 |
| **206** | 10:00 AM | Senior | Bantam Weight | Red | R1 |
| **207** | 10:15 AM | Senior | Fly Weight | Yellow | R1 |
| **208** | 10:30 AM | Gradeschool | Fly Weight | Yellow | R1 |
| **209** | 10:40 AM | Gradeschool | Fly Weight | Yellow | R1 |
| **210** | 10:50 AM | Cadet | Fin Weight | Red | R1 |
| **211** | 11:00 AM | Cadet | Fin Weight | White | R1 |
| **212** | 11:10 AM | Senior | Heavy Weight | Black | R2 |
| **213** | 11:25 AM | Gradeschool | Heavy Weight | White | R2 |
| **214** | 11:35 AM | Gradeschool | Heavy Weight | Black | R2 |
| **215** | 11:45 AM | Cadet | Heavy Weight | Red | R2 |
| **216** | 11:55 AM | Senior | Bantam Weight | Yellow | R2 |
| **217** | 12:10 PM | Cadet | Welter Weight | Blue | R2 |
| **218** | 12:20 PM | Cadet | Welter Weight | Yellow | R2 |
| **219** | 12:30 PM | Senior | Bantam Weight | Red | R2 |
| **220** | 12:45 PM | Cadet | Welter Weight | Black | R2 |
| **221** | 12:55 PM | Gradeschool | Fly Weight | Black | R2 |
| **222** | 1:05 PM | Senior | Welter Weight | Blue | R2 |
| **223** | 1:20 PM | Senior | Welter Weight | Red | R2 |
| **224** | 1:35 PM | Senior | Feather Weight | White | R3 |
| **225** | 1:50 PM | Senior | Feather Weight | Yellow | R3 |
| **226** | 2:05 PM | Senior | Fin Weight | Red | R3 |
| **227** | 2:20 PM | Gradeschool | Heavy Weight | Yellow | R3 |
| **228** | 2:30 PM | Gradeschool | Heavy Weight | Yellow | R3 |
| **229** | 2:40 PM | Cadet | Heavy Weight | Yellow | R3 |
| **230** | 2:50 PM | Junior | Welter Weight | Blue | R3 |
| **231** | 3:05 PM | Cadet | Welter Weight | Red | R3 |
| **232** | 3:15 PM | Senior | Bantam Weight | Yellow | R3 |
| **233** | 3:30 PM | Cadet | Fin Weight | Blue | R3 |
| **234** | 3:40 PM | Gradeschool | Feather Weight | Blue | R3 |
| **235** | 3:50 PM | Gradeschool | Fly Weight | Red | R3 |
| **236** | 4:00 PM | Gradeschool | Fly Weight | White | R3 |
| **237** | 4:10 PM | Senior | Welter Weight | Red | R3 |
| **238** | 4:25 PM | Cadet | Fin Weight | Blue | R3 |

#### Court 3

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **301** | 9:00 AM | Senior | Heavy Weight | White | R1 |
| **302** | 9:15 AM | Senior | Fin Weight | Black | R1 |
| **303** | 9:30 AM | Gradeschool | Heavy Weight | Red | R1 |
| **304** | 9:40 AM | Gradeschool | Feather Weight | Black | R1 |
| **305** | 9:50 AM | Cadet | Heavy Weight | White | R1 |
| **306** | 10:00 AM | Senior | Fly Weight | Red | R1 |
| **307** | 10:15 AM | Senior | Welter Weight | Red | R1 |
| **308** | 10:30 AM | Cadet | Fin Weight | Red | R1 |
| **309** | 10:40 AM | Gradeschool | Fly Weight | Blue | R1 |
| **310** | 10:50 AM | Cadet | Fin Weight | Red | R1 |
| **311** | 11:00 AM | Senior | Feather Weight | Red | R2 |
| **312** | 11:15 AM | Senior | Fin Weight | Blue | R2 |
| **313** | 11:30 AM | Gradeschool | Feather Weight | White | R2 |
| **314** | 11:40 AM | Cadet | Heavy Weight | Blue | R2 |
| **315** | 11:50 AM | Junior | Welter Weight | Yellow | R2 |
| **316** | 12:05 PM | Senior | Bantam Weight | Black | R2 |
| **317** | 12:20 PM | Senior | Welter Weight | Blue | R2 |
| **318** | 12:35 PM | Cadet | Fin Weight | Blue | R2 |
| **319** | 12:45 PM | Cadet | Welter Weight | Blue | R2 |
| **320** | 12:55 PM | Gradeschool | Fly Weight | Red | R2 |
| **321** | 1:05 PM | Senior | Welter Weight | Blue | R2 |
| **322** | 1:20 PM | Senior | Feather Weight | Blue | R3 |
| **323** | 1:35 PM | Senior | Feather Weight | White | R3 |
| **324** | 1:50 PM | Senior | Heavy Weight | Yellow | R3 |
| **325** | 2:05 PM | Senior | Fin Weight | Red | R3 |
| **326** | 2:20 PM | Gradeschool | Feather Weight | Yellow | R3 |
| **327** | 2:30 PM | Gradeschool | Heavy Weight | Yellow | R3 |
| **328** | 2:40 PM | Junior | Welter Weight | Yellow | R3 |
| **329** | 2:55 PM | Senior | Bantam Weight | Yellow | R3 |
| **330** | 3:10 PM | Senior | Bantam Weight | Yellow | R3 |
| **331** | 3:25 PM | Gradeschool | Welter Weight | White | R3 |
| **332** | 3:35 PM | Cadet | Fin Weight | White | R3 |
| **333** | 3:45 PM | Cadet | Welter Weight | Yellow | R3 |
| **334** | 3:55 PM | Gradeschool | Fly Weight | White | R3 |
| **335** | 4:05 PM | Senior | Welter Weight | Blue | R3 |
| **336** | 4:20 PM | Senior | Welter Weight | Yellow | R3 |

#### Court 4

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **401** | 9:00 AM | Senior | Heavy Weight | Yellow | R1 |
| **402** | 9:15 AM | Senior | Fin Weight | Yellow | R1 |
| **403** | 9:30 AM | Gradeschool | Heavy Weight | Blue | R1 |
| **404** | 9:40 AM | Gradeschool | Feather Weight | Red | R1 |
| **405** | 9:50 AM | Cadet | Heavy Weight | Black | R1 |
| **406** | 10:00 AM | Senior | Fly Weight | White | R1 |
| **407** | 10:15 AM | Senior | Welter Weight | Red | R1 |
| **408** | 10:30 AM | Gradeschool | Welter Weight | Red | R1 |
| **409** | 10:40 AM | Gradeschool | Fly Weight | White | R1 |
| **410** | 10:50 AM | Senior | Welter Weight | White | R1 |
| **411** | 11:05 AM | Senior | Heavy Weight | White | R2 |
| **412** | 11:20 AM | Gradeschool | Heavy Weight | Red | R2 |
| **413** | 11:30 AM | Gradeschool | Heavy Weight | White | R2 |
| **414** | 11:40 AM | Cadet | Heavy Weight | Red | R2 |
| **415** | 11:50 AM | Junior | Welter Weight | Blue | R2 |
| **416** | 12:05 PM | Senior | Bantam Weight | White | R2 |
| **417** | 12:20 PM | Senior | Welter Weight | Blue | R2 |
| **418** | 12:35 PM | Cadet | Fin Weight | White | R2 |
| **419** | 12:45 PM | Gradeschool | Feather Weight | Yellow | R2 |
| **420** | 12:55 PM | Gradeschool | Fly Weight | Blue | R2 |
| **421** | 1:05 PM | Senior | Welter Weight | Yellow | R2 |
| **422** | 1:20 PM | Senior | Feather Weight | Black | R3 |
| **423** | 1:35 PM | Senior | Feather Weight | Red | R3 |
| **424** | 1:50 PM | Senior | Heavy Weight | Red | R3 |
| **425** | 2:05 PM | Senior | Fin Weight | Yellow | R3 |
| **426** | 2:20 PM | Gradeschool | Feather Weight | Blue | R3 |
| **427** | 2:30 PM | Gradeschool | Feather Weight | White | R3 |
| **428** | 2:40 PM | Junior | Welter Weight | Yellow | R3 |
| **429** | 2:55 PM | Senior | Fly Weight | White | R3 |
| **430** | 3:10 PM | Senior | Bantam Weight | Blue | R3 |
| **431** | 3:25 PM | Gradeschool | Welter Weight | Red | R3 |
| **432** | 3:35 PM | Gradeschool | Feather Weight | Yellow | R3 |
| **433** | 3:45 PM | Gradeschool | Fly Weight | Yellow | R3 |
| **434** | 3:55 PM | Gradeschool | Fly Weight | Yellow | R3 |
| **435** | 4:05 PM | Senior | Welter Weight | Red | R3 |
| **436** | 4:20 PM | Cadet | Fin Weight | Red | R3 |
| **437** | 4:30 PM | Cadet | Fin Weight | Yellow | R3 |

### Day 3

#### Court 1

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **101** | 9:00 AM | Junior | Light Weight | Black | R1 |
| **102** | 9:15 AM | Gradeschool | Bantam Weight | Yellow | R1 |
| **103** | 9:25 AM | Gradeschool | Bantam Weight | White | R1 |
| **104** | 9:35 AM | Junior | Welter Weight | Red | R1 |
| **105** | 9:50 AM | Junior | Welter Weight | Red | R1 |
| **106** | 10:05 AM | Cadet | Fly Weight | Red | R1 |
| **107** | 10:15 AM | Senior | Heavy Weight | White | R1 |
| **108** | 10:30 AM | Senior | Light Weight | Yellow | R1 |
| **109** | 10:45 AM | Cadet | Middle Weight | White | R1 |
| **110** | 10:55 AM | Junior | Heavy Weight | Blue | R1 |
| **111** | 11:10 AM | Cadet | Bantam Weight | Black | R1 |
| **112** | 11:20 AM | Cadet | Bantam Weight | White | R1 |
| **113** | 11:30 AM | Junior | Middle Weight | Red | R1 |
| **114** | 11:45 AM | Junior | Middle Weight | Red | R1 |
| **115** | 12:00 PM | Junior | Light Weight | Red | R2 |
| **116** | 12:15 PM | Junior | Bantam Weight | Black | R2 |
| **117** | 12:30 PM | Gradeschool | Light Weight | Red | R2 |
| **118** | 12:40 PM | Cadet | Bantam Weight | Yellow | R2 |
| **119** | 12:50 PM | Junior | Heavy Weight | Black | R2 |
| **120** | 1:05 PM | Junior | Bantam Weight | Yellow | R2 |
| **121** | 1:20 PM | Cadet | Bantam Weight | Black | R2 |
| **122** | 1:30 PM | Junior | Middle Weight | Black | R2 |
| **123** | 1:45 PM | Junior | Middle Weight | Blue | R2 |
| **124** | 2:00 PM | Junior | Light Weight | Black | R3 |
| **125** | 2:15 PM | Junior | Bantam Weight | Yellow | R3 |
| **126** | 2:30 PM | Cadet | Fly Weight | Yellow | R3 |
| **127** | 2:40 PM | Cadet | Fly Weight | Blue | R3 |
| **128** | 2:50 PM | Senior | Light Weight | Yellow | R3 |
| **129** | 3:05 PM | Cadet | Bantam Weight | Red | R3 |
| **130** | 3:15 PM | Cadet | Bantam Weight | White | R3 |
| **131** | 3:25 PM | Junior | Heavy Weight | Black | R3 |
| **132** | 3:40 PM | Junior | Heavy Weight | Yellow | R3 |
| **133** | 3:55 PM | Cadet | Bantam Weight | Yellow | R3 |
| **134** | 4:05 PM | Cadet | Bantam Weight | Red | R3 |
| **135** | 4:15 PM | Junior | Fly Weight | White | R3 |
| **136** | 4:30 PM | Junior | Fly Weight | White | R3 |

#### Court 2

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **201** | 9:00 AM | Junior | Light Weight | White | R1 |
| **202** | 9:15 AM | Gradeschool | Bantam Weight | Red | R1 |
| **203** | 9:25 AM | Gradeschool | Bantam Weight | Blue | R1 |
| **204** | 9:35 AM | Junior | Bantam Weight | Black | R1 |
| **205** | 9:50 AM | Junior | Welter Weight | Red | R1 |
| **206** | 10:05 AM | Junior | Welter Weight | White | R1 |
| **207** | 10:20 AM | Senior | Heavy Weight | White | R1 |
| **208** | 10:35 AM | Senior | Light Weight | Blue | R1 |
| **209** | 10:50 AM | Junior | Heavy Weight | Yellow | R1 |
| **210** | 11:05 AM | Junior | Bantam Weight | Red | R1 |
| **211** | 11:20 AM | Cadet | Bantam Weight | Black | R1 |
| **212** | 11:30 AM | Junior | Fly Weight | Blue | R1 |
| **213** | 11:45 AM | Junior | Middle Weight | Red | R1 |
| **214** | 12:00 PM | Junior | Light Weight | White | R2 |
| **215** | 12:15 PM | Junior | Bantam Weight | Red | R2 |
| **216** | 12:30 PM | Senior | Heavy Weight | Yellow | R2 |
| **217** | 12:45 PM | Cadet | Middle Weight | Red | R2 |
| **218** | 12:55 PM | Junior | Bantam Weight | Blue | R2 |
| **219** | 1:10 PM | Junior | Bantam Weight | Blue | R2 |
| **220** | 1:25 PM | Junior | Fly Weight | Red | R2 |
| **221** | 1:40 PM | Junior | Middle Weight | Black | R2 |
| **222** | 1:55 PM | Junior | Light Weight | Yellow | R3 |
| **223** | 2:10 PM | Gradeschool | Bantam Weight | Yellow | R3 |
| **224** | 2:20 PM | Junior | Bantam Weight | White | R3 |
| **225** | 2:35 PM | Cadet | Fly Weight | Blue | R3 |
| **226** | 2:45 PM | Senior | Light Weight | Red | R3 |
| **227** | 3:00 PM | Gradeschool | Light Weight | Red | R3 |
| **228** | 3:10 PM | Cadet | Bantam Weight | Blue | R3 |
| **229** | 3:20 PM | Junior | Heavy Weight | White | R3 |
| **230** | 3:35 PM | Junior | Heavy Weight | Black | R3 |
| **231** | 3:50 PM | Junior | Bantam Weight | Red | R3 |
| **232** | 4:05 PM | Cadet | Bantam Weight | Yellow | R3 |
| **233** | 4:15 PM | Cadet | Bantam Weight | Yellow | R3 |
| **234** | 4:25 PM | Junior | Fly Weight | Red | R3 |
| **235** | 4:40 PM | Cadet | Feather Weight | Red | R3 |

#### Court 3

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **301** | 9:00 AM | Junior | Light Weight | Yellow | R1 |
| **302** | 9:15 AM | Gradeschool | Bantam Weight | Yellow | R1 |
| **303** | 9:25 AM | Junior | Bantam Weight | Black | R1 |
| **304** | 9:40 AM | Junior | Welter Weight | Blue | R1 |
| **305** | 9:55 AM | Junior | Welter Weight | White | R1 |
| **306** | 10:10 AM | Cadet | Fly Weight | Black | R1 |
| **307** | 10:20 AM | Senior | Heavy Weight | Black | R1 |
| **308** | 10:35 AM | Gradeschool | Light Weight | White | R1 |
| **309** | 10:45 AM | Gradeschool | Light Weight | Black | R1 |
| **310** | 10:55 AM | Junior | Bantam Weight | Blue | R1 |
| **311** | 11:10 AM | Junior | Bantam Weight | Black | R1 |
| **312** | 11:25 AM | Junior | Fly Weight | Yellow | R1 |
| **313** | 11:40 AM | Junior | Middle Weight | Black | R1 |
| **314** | 11:55 AM | Junior | Light Weight | Red | R2 |
| **315** | 12:10 PM | Gradeschool | Bantam Weight | Red | R2 |
| **316** | 12:20 PM | Cadet | Fly Weight | Black | R2 |
| **317** | 12:30 PM | Senior | Heavy Weight | Black | R2 |
| **318** | 12:45 PM | Cadet | Middle Weight | Black | R2 |
| **319** | 12:55 PM | Junior | Bantam Weight | Red | R2 |
| **320** | 1:10 PM | Junior | Bantam Weight | Red | R2 |
| **321** | 1:25 PM | Junior | Fly Weight | White | R2 |
| **322** | 1:40 PM | Junior | Middle Weight | White | R2 |
| **323** | 1:55 PM | Junior | Light Weight | White | R3 |
| **324** | 2:10 PM | Gradeschool | Bantam Weight | Yellow | R3 |
| **325** | 2:20 PM | Junior | Bantam Weight | Red | R3 |
| **326** | 2:35 PM | Cadet | Fly Weight | Yellow | R3 |
| **327** | 2:45 PM | Senior | Light Weight | Red | R3 |
| **328** | 3:00 PM | Gradeschool | Light Weight | Blue | R3 |
| **329** | 3:10 PM | Cadet | Bantam Weight | Blue | R3 |
| **330** | 3:20 PM | Junior | Heavy Weight | Red | R3 |
| **331** | 3:35 PM | Junior | Heavy Weight | White | R3 |
| **332** | 3:50 PM | Junior | Bantam Weight | Red | R3 |
| **333** | 4:05 PM | Cadet | Bantam Weight | Yellow | R3 |
| **334** | 4:15 PM | Junior | Fly Weight | Black | R3 |
| **335** | 4:30 PM | Junior | Middle Weight | Yellow | R3 |

#### Court 4

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **401** | 9:00 AM | Junior | Light Weight | Black | R1 |
| **402** | 9:15 AM | Gradeschool | Bantam Weight | Black | R1 |
| **403** | 9:25 AM | Junior | Bantam Weight | Red | R1 |
| **404** | 9:40 AM | Gradeschool | Bantam Weight | Yellow | R1 |
| **405** | 9:50 AM | Junior | Welter Weight | Yellow | R1 |
| **406** | 10:05 AM | Cadet | Fly Weight | Blue | R1 |
| **407** | 10:15 AM | Senior | Heavy Weight | Red | R1 |
| **408** | 10:30 AM | Senior | Light Weight | Yellow | R1 |
| **409** | 10:45 AM | Cadet | Middle Weight | Red | R1 |
| **410** | 10:55 AM | Junior | Heavy Weight | White | R1 |
| **411** | 11:10 AM | Junior | Bantam Weight | Yellow | R1 |
| **412** | 11:25 AM | Junior | Fly Weight | Black | R1 |
| **413** | 11:40 AM | Junior | Middle Weight | Black | R1 |
| **414** | 11:55 AM | Cadet | Feather Weight | Yellow | R1 |
| **415** | 12:05 PM | Gradeschool | Bantam Weight | Red | R2 |
| **416** | 12:15 PM | Junior | Bantam Weight | Black | R2 |
| **417** | 12:30 PM | Gradeschool | Light Weight | Yellow | R2 |
| **418** | 12:40 PM | Gradeschool | Light Weight | Yellow | R2 |
| **419** | 12:50 PM | Junior | Heavy Weight | Blue | R2 |
| **420** | 1:05 PM | Junior | Heavy Weight | Blue | R2 |
| **421** | 1:20 PM | Cadet | Bantam Weight | Yellow | R2 |
| **422** | 1:30 PM | Junior | Fly Weight | Blue | R2 |
| **423** | 1:45 PM | Cadet | Feather Weight | White | R2 |
| **424** | 1:55 PM | Junior | Light Weight | Red | R3 |
| **425** | 2:10 PM | Junior | Bantam Weight | Red | R3 |
| **426** | 2:25 PM | Junior | Welter Weight | Blue | R3 |
| **427** | 2:40 PM | Senior | Heavy Weight | Black | R3 |
| **428** | 2:55 PM | Senior | Light Weight | Black | R3 |
| **429** | 3:10 PM | Cadet | Bantam Weight | Yellow | R3 |
| **430** | 3:20 PM | Cadet | Bantam Weight | Yellow | R3 |
| **431** | 3:30 PM | Junior | Heavy Weight | Yellow | R3 |
| **432** | 3:45 PM | Junior | Bantam Weight | Black | R3 |
| **433** | 4:00 PM | Cadet | Bantam Weight | Black | R3 |
| **434** | 4:10 PM | Cadet | Bantam Weight | Blue | R3 |
| **435** | 4:20 PM | Junior | Fly Weight | Red | R3 |
| **436** | 4:35 PM | Cadet | Feather Weight | Black | R3 |

### Day 4

#### Court 1

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **101** | 9:00 AM | Gradeschool | Middle Weight | Black | R1 |
| **102** | 9:10 AM | Junior | Fly Weight | White | R1 |
| **103** | 9:25 AM | Gradeschool | Light Weight | Black | R1 |
| **104** | 9:35 AM | Junior | Light Weight | Black | R1 |
| **105** | 9:50 AM | Gradeschool | Middle Weight | Blue | R2 |
| **106** | 10:00 AM | Gradeschool | Middle Weight | Black | R2 |
| **107** | 10:10 AM | Cadet | Middle Weight | Black | R2 |
| **108** | 10:20 AM | Gradeschool | Middle Weight | Red | R2 |
| **109** | 10:30 AM | Junior | Middle Weight | Black | R2 |
| **110** | 10:45 AM | Senior | Middle Weight | Black | R3 |
| **111** | 11:00 AM | Cadet | Middle Weight | White | R3 |
| **112** | 11:10 AM | Cadet | Middle Weight | Black | R3 |
| **113** | 11:20 AM | Gradeschool | Light Weight | Blue | R3 |
| **114** | 11:30 AM | Junior | Feather Weight | Red | R3 |
| **115** | 11:45 AM | Junior | Middle Weight | Blue | R3 |

#### Court 2

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **201** | 9:00 AM | Gradeschool | Middle Weight | Red | R1 |
| **202** | 9:10 AM | Junior | Fly Weight | Black | R1 |
| **203** | 9:25 AM | Gradeschool | Light Weight | White | R1 |
| **204** | 9:35 AM | Gradeschool | Light Weight | White | R1 |
| **205** | 9:45 AM | Junior | Middle Weight | Red | R1 |
| **206** | 10:00 AM | Gradeschool | Middle Weight | Black | R2 |
| **207** | 10:10 AM | Senior | Middle Weight | Red | R2 |
| **208** | 10:25 AM | Gradeschool | Light Weight | Blue | R2 |
| **209** | 10:35 AM | Gradeschool | Middle Weight | Blue | R3 |
| **210** | 10:45 AM | Gradeschool | Middle Weight | Yellow | R3 |
| **211** | 10:55 AM | Senior | Middle Weight | White | R3 |
| **212** | 11:10 AM | Junior | Fly Weight | Black | R3 |
| **213** | 11:25 AM | Junior | Feather Weight | Black | R3 |
| **214** | 11:40 AM | Junior | Light Weight | White | R3 |

#### Court 3

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **301** | 9:00 AM | Senior | Middle Weight | White | R1 |
| **302** | 9:15 AM | Junior | Fly Weight | Red | R1 |
| **303** | 9:30 AM | Gradeschool | Light Weight | White | R1 |
| **304** | 9:40 AM | Junior | Middle Weight | White | R1 |
| **305** | 9:55 AM | Gradeschool | Middle Weight | Yellow | R2 |
| **306** | 10:05 AM | Senior | Middle Weight | Black | R2 |
| **307** | 10:20 AM | Gradeschool | Light Weight | White | R2 |
| **308** | 10:30 AM | Junior | Feather Weight | White | R2 |
| **309** | 10:45 AM | Senior | Middle Weight | White | R3 |
| **310** | 11:00 AM | Cadet | Middle Weight | White | R3 |
| **311** | 11:10 AM | Junior | Fly Weight | Black | R3 |
| **312** | 11:25 AM | Junior | Feather Weight | Red | R3 |
| **313** | 11:40 AM | Junior | Light Weight | White | R3 |

#### Court 4

| Match # | Time | Division | Category | Belt | Round |
|---|---|---|---|---|---|
| **401** | 9:00 AM | Cadet | Middle Weight | Blue | R1 |
| **402** | 9:10 AM | Cadet | Middle Weight | Yellow | R1 |
| **403** | 9:20 AM | Junior | Fly Weight | White | R1 |
| **404** | 9:35 AM | Junior | Light Weight | Yellow | R1 |
| **405** | 9:50 AM | Junior | Middle Weight | Blue | R1 |
| **406** | 10:05 AM | Senior | Middle Weight | Black | R2 |
| **407** | 10:20 AM | Cadet | Middle Weight | Black | R2 |
| **408** | 10:30 AM | Junior | Light Weight | Yellow | R2 |
| **409** | 10:45 AM | Senior | Middle Weight | Blue | R3 |
| **410** | 11:00 AM | Cadet | Middle Weight | White | R3 |
| **411** | 11:10 AM | Junior | Fly Weight | Blue | R3 |
| **412** | 11:25 AM | Junior | Feather Weight | Blue | R3 |
| **413** | 11:40 AM | Junior | Feather Weight | Black | R3 |


## Distribution Stats

- **Belts**: {"Black":93,"Yellow":112,"Red":101,"Blue":93,"White":101}

;
; Apple 1 Cellular Automaton
; https://mathworld.wolfram.com/CellularAutomaton.html
; By Will Scullin
;
		ORG	$300

ECHO		EQU	$FFEF
CR              EQU     $8D

; Load Rule $5A = 90
START		LDA	#$5A
		LDX	#0
RULELOOP	LSR	A
		TAY
		LDA	#$00
		ROR	A
		STA	RULES,X
		TYA
		INX
		CPX	#$08
		BNE	RULELOOP
;  Print Row
OUT		LDA	#CR
		JSR	ECHO
		LDX	#$00
OUTLOOP		LDA	CELLS,X
		BMI	SOLID
		LDA	#' '
		BPL	OUT
SOLID		LDA	#'X'
OUT		JSR	ECHO
		INX
		CPX	#$27
		BCC	OUTLOOP
; Update Row
		LDA 	CELLS
		ASL	A
		LDA	#$00
		ROL	A
		LDX	#$FF
UPDATELOOP	INX
		TAY
		LDA	CELLS+1,X
		ASL
		TYA
		ROL	A
		TAY
		LDA	RULE,Y
		STA	CELLS,X
		TYA
		AND	#$03
		CPX	#$27
		BCC	UPDATELOOP
		BCS	OUT
; Workspace
CELLS		DB	$00,$00,$00,$00,$00,$00,$00,$00,
		DB 	$00,$00,$00,$00,$00,$00,$00,$00,
		DB	$00,$00,$00,$80,$00,$00,$00,$00,
		DB	$00,$00,$00,$00,$00,$00,$00,$00,
		DB	$00,$00,$00,$00,$00,$00,$00,$00

RULE		DB	$00,$00,$00,$00,$00,$00,$00,$00

000
001

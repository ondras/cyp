LESS := $(shell npm bin)/lessc
APP := app.css

all: $(APP)

$(APP): css/*
	$(LESS) css/app.less > $@

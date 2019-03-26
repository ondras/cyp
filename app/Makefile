LESS := $(shell npm bin)/lessc
APP := app.css
ICONS := js/lib/icons.js

all: $(APP)

icons: $(ICONS)

$(ICONS): icons/*
	./svg2js.sh icons > $@

$(APP): css/*
	$(LESS) css/app.less > $@

watch: all
	while inotifywait -e MODIFY -r css js ; do make $^ ; done

.PHONY: all watch icons

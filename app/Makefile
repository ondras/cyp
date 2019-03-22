LESS := $(shell npm bin)/lessc
APP := app.css

all: $(APP)

$(APP): css/*
	$(LESS) css/app.less > $@

watch: all
	while inotifywait -e MODIFY -r css js ; do make $^ ; done

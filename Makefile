LESS := $(shell npm bin)/lessc
APP := app
CSS := $(APP)/app.css
ICONS := $(APP)/js/lib/icons.js
SYSD_USER := ~/.config/systemd/user
SERVICE := cyp.service

all: $(CSS)

icons: $(ICONS)

$(ICONS): $(APP)/icons/*
	$(APP)/svg2js.sh $(APP)/icons > $@

$(CSS): $(APP)/css/*
	$(LESS) $(APP)/css/app.less > $@

service: $(SERVICE)
	systemctl --user enable $(PWD)/$(SERVICE)

$(SERVICE): misc/cyp.service.template
	cat $^ | envsubst > $@

watch: all
	while inotifywait -e MODIFY -r $(APP)/css $(APP)/js ; do make $^ ; done

clean:
	rm -f $(SERVICE) $(CSS)

.PHONY: all watch icons service clean
